import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import CampaignForm from "@/components/CampaignForm";
import { updateCampaign } from "@/app/actions/campaigns";

export const dynamic = "force-dynamic";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
  if (!campaign) notFound();

  const action = updateCampaign.bind(null, id);

  return (
    <main className="p-6 md:p-8">
      <PageHeader title="Edit Campaign" />
      <CampaignForm action={action} campaign={campaign} />
    </main>
  );
}
