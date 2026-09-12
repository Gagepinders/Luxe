import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Button, StatusBadge, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const campaigns = await prisma.emailCampaign.findMany({
    orderBy: { createdAt: "desc" },
  });
  const resendConfigured = Boolean(process.env.RESEND_API_KEY);

  return (
    <main className="p-6 md:p-8">
      <PageHeader
        title="Campaigns"
        subtitle="Send updates, promos, and seasonal reminders to your customers"
        action={
          <Button href="/campaigns/new">
            <Plus size={16} /> New Campaign
          </Button>
        }
      />

      {!resendConfigured && (
        <div className="mb-5 rounded-lg border border-warning/30 bg-warning-100 px-4 py-3 text-sm text-warning">
          Email sending isn&rsquo;t configured yet — set <code>RESEND_API_KEY</code> to enable
          sending. You can still draft campaigns.
        </div>
      )}

      {campaigns.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          description="Draft an email and send it to a filtered list of customers."
          action={
            <Button href="/campaigns/new">
              <Plus size={16} /> New Campaign
            </Button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-forest-950/60 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3 hidden sm:table-cell">Audience</th>
                <th className="px-4 py-3 hidden md:table-cell">Recipients</th>
                <th className="px-4 py-3 hidden md:table-cell">Sent</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-t border-border-subtle hover:bg-surface-muted/60">
                  <td className="px-4 py-3">
                    <Link href={`/campaigns/${c.id}`} className="font-medium text-forest-950">
                      {c.subject}
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-forest-950/70">{c.audience}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-forest-950/70">
                    {c.recipientCount || "—"}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-forest-950/60">
                    {c.sentAt ? formatDate(c.sentAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
