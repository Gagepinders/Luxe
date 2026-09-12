import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Button, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { sendCampaign, deleteCampaign } from "@/app/actions/campaigns";
import { countAudience } from "@/app/actions/campaigns";
import { Pencil, Trash2, Send } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
  if (!campaign) notFound();

  const audienceCount = await countAudience(campaign.audience);
  const resendConfigured = Boolean(process.env.RESEND_API_KEY);

  const send = sendCampaign.bind(null, id);
  const remove = deleteCampaign.bind(null, id);

  return (
    <main className="p-6 md:p-8 space-y-6">
      <PageHeader
        title={campaign.subject}
        subtitle={`Audience: ${campaign.audience}`}
        action={
          <div className="flex flex-wrap gap-2">
            {campaign.status === "draft" && (
              <Button href={`/campaigns/${id}/edit`} variant="secondary">
                <Pencil size={14} /> Edit
              </Button>
            )}
            <form action={remove}>
              <Button type="submit" variant="danger">
                <Trash2 size={14} /> Delete
              </Button>
            </form>
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <section className="card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={campaign.status} />
              {campaign.sentAt && (
                <span className="text-xs text-forest-950/50">
                  Sent {formatDate(campaign.sentAt)} to {campaign.recipientCount} recipients
                </span>
              )}
            </div>
            <div className="border-t border-border-subtle pt-4">
              <p className="text-xs uppercase tracking-wide text-forest-950/50 mb-2">Preview</p>
              <div
                className="text-sm text-forest-950/80 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: campaign.body.replaceAll("{{name}}", "there").replaceAll("\n", "<br>"),
                }}
              />
            </div>
            {campaign.errorMessage && (
              <p className="text-sm text-danger border-t border-border-subtle pt-3">
                {campaign.errorMessage}
              </p>
            )}
          </section>
        </div>

        <div className="space-y-3">
          <section className="card p-5 space-y-2">
            <h2 className="font-semibold text-forest-950 mb-2 text-sm">Send</h2>
            <p className="text-xs text-forest-950/50 mb-2">
              {audienceCount} recipient{audienceCount === 1 ? "" : "s"} match this audience right now.
            </p>
            {!resendConfigured && (
              <p className="text-xs text-warning bg-warning-100 rounded-lg px-2 py-1.5">
                Email isn&rsquo;t configured. Set RESEND_API_KEY to send.
              </p>
            )}
            {(campaign.status === "draft" || campaign.status === "failed") && (
              <form action={send}>
                <Button type="submit" className="w-full" disabled={!resendConfigured}>
                  <Send size={14} /> Send now
                </Button>
              </form>
            )}
            {campaign.status === "sent" && (
              <p className="text-sm text-success">This campaign has already been sent.</p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
