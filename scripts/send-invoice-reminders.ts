import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { getCompanyProfile } from "@/lib/companyProfile";
import { getResendClient, getFromAddress, getReplyToAddress } from "@/lib/resend";
import { getAppUrl } from "@/lib/appUrl";
import { generateToken } from "@/lib/tokens";
import { formatCurrency, formatDate } from "@/lib/format";

// Runs on a schedule (a separate Railway service — see the "luxe-invoice-reminders"
// cron service, not the main web app) to nudge customers about unpaid overdue
// invoices. Reminds once when an invoice first goes overdue, then again every
// 7 days it's still unpaid — never more often than that.
const REMINDER_INTERVAL_DAYS = 7;

async function main() {
  const resend = getResendClient();
  if (!resend) {
    console.log("Resend isn't configured — nothing to do.");
    return;
  }

  const now = new Date();
  const reminderCutoff = new Date(now.getTime() - REMINDER_INTERVAL_DAYS * 24 * 60 * 60 * 1000);

  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: "sent",
      dueAt: { lt: now },
      OR: [{ lastReminderSentAt: null }, { lastReminderSentAt: { lt: reminderCutoff } }],
    },
    include: { customer: true, lineItems: true },
  });

  if (overdueInvoices.length === 0) {
    console.log("No overdue invoices need a reminder right now.");
    return;
  }

  const company = await getCompanyProfile();
  let sent = 0;

  for (const invoice of overdueInvoices) {
    if (!invoice.customer.email) {
      console.log(`Skipping invoice #${invoice.number} — customer has no email on file.`);
      continue;
    }

    const total = invoice.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
    const token = invoice.publicToken ?? generateToken();
    const link = `${getAppUrl()}/i/${token}`;
    const daysOverdue = Math.floor(
      (now.getTime() - new Date(invoice.dueAt!).getTime()) / (24 * 60 * 60 * 1000)
    );

    try {
      await resend.emails.send({
        from: getFromAddress(),
        to: invoice.customer.email,
        replyTo: getReplyToAddress(),
        subject: `Reminder: Invoice #${invoice.number} is overdue`,
        html: `
          <p>Hi ${invoice.customer.name.split(" ")[0]},</p>
          <p>Just a friendly reminder that invoice #${invoice.number} for <strong>${formatCurrency(
            total
          )}</strong> was due ${formatDate(invoice.dueAt!)} (${daysOverdue} day${
            daysOverdue === 1 ? "" : "s"
          } ago) and hasn't been paid yet.</p>
          <p><a href="${link}" style="display:inline-block;background:#235233;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:600;">View & pay invoice</a></p>
          <p style="color:#666;font-size:13px;">Or copy this link: ${link}</p>
          <p>Thanks,<br>${company.name}<br>${company.phone}</p>
        `,
      });

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { publicToken: token, lastReminderSentAt: now },
      });

      await prisma.activity.create({
        data: {
          customerId: invoice.customerId,
          type: "email",
          body: `Automated overdue-payment reminder sent for invoice #${invoice.number} (${daysOverdue} days overdue).`,
        },
      });

      console.log(`Sent reminder for invoice #${invoice.number} to ${invoice.customer.email}.`);
      sent++;
    } catch (err) {
      console.error(`Failed to send reminder for invoice #${invoice.number}:`, err);
    }
  }

  console.log(`Done — ${sent}/${overdueInvoices.length} reminder(s) sent.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
