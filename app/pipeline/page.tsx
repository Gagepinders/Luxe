import { prisma } from "@/lib/prisma";
import { PageHeader, Button } from "@/components/ui";
import PipelineBoard from "@/components/PipelineBoard";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const customers = await prisma.customer.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      companyName: true,
      email: true,
      phone: true,
      type: true,
      tags: true,
      pipelineStage: true,
      updatedAt: true,
    },
  });

  const wonCount = customers.filter((c) => c.pipelineStage === "won").length;
  const lostCount = customers.filter((c) => c.pipelineStage === "lost").length;
  const decided = wonCount + lostCount;
  const winRate = decided > 0 ? (wonCount / decided) * 100 : 0;

  return (
    <main className="p-6 md:p-8">
      <PageHeader
        title="Pipeline"
        subtitle={`${customers.length} customers · ${winRate.toFixed(0)}% win rate`}
        action={
          <Button href="/customers/new?stage=new">
            <Plus size={16} /> New Lead
          </Button>
        }
      />
      <p className="text-xs text-forest-950/50 mb-4">
        Drag a card between columns to move a customer through your sales process.
      </p>
      <PipelineBoard
        customers={customers.map((c) => ({ ...c, updatedAt: c.updatedAt.toISOString() }))}
      />
    </main>
  );
}
