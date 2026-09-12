"use server";

import { prisma } from "@/lib/prisma";
import { getResendClient, getFromAddress, getReplyToAddress } from "@/lib/resend";
import { getCompanyProfile } from "@/lib/companyProfile";

// Catch-all for anything the instant-quote tool doesn't handle (bigger
// landscaping jobs, mulch, cleanups, general questions) — same destination
// as the existing website contact form (/api/leads), just reachable as a
// same-site server action instead of needing an API key in the browser.
export async function submitGeneralInquiry(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const addressLine = String(formData.get("addressLine") ?? "").trim();

  if (!name) throw new Error("Name is required.");
  if (!email && !phone) throw new Error("Add an email or phone number.");

  const customer = await prisma.customer.create({
    data: {
      name,
      email: email || null,
      phone: phone || null,
      status: "lead",
      pipelineStage: "new",
      source: "website_inquiry",
      notes: message || null,
    },
  });
  if (addressLine) {
    await prisma.property.create({ data: { customerId: customer.id, addressLine } });
  }
  await prisma.activity.create({
    data: {
      customerId: customer.id,
      type: "note",
      body: `New inquiry from the website.${message ? `\n${message}` : ""}`,
    },
  });

  const resend = getResendClient();
  const company = await getCompanyProfile();
  if (resend && company.email) {
    await resend.emails.send({
      from: getFromAddress(),
      to: company.email,
      replyTo: getReplyToAddress(),
      subject: `New website inquiry — ${name}`,
      html: `<p>${name} sent a message through the website.</p>
             ${message ? `<p>${message}</p>` : ""}
             ${addressLine ? `<p>Address: ${addressLine}</p>` : ""}
             <p>Contact: ${email || ""} ${phone || ""}</p>`,
    });
  }

  return { ok: true as const };
}
