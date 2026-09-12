import { PageHeader } from "@/components/ui";
import CampaignForm from "@/components/CampaignForm";
import { createCampaign } from "@/app/actions/campaigns";

export const dynamic = "force-dynamic";

export default function NewCampaignPage() {
  return (
    <main className="p-6 md:p-8">
      <PageHeader title="New Campaign" />
      <CampaignForm action={createCampaign} />
    </main>
  );
}
