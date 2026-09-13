import { prisma } from "@/lib/prisma";
import { PageHeader, Button, StatCard } from "@/components/ui";
import PipelineBoard from "@/components/PipelineBoard";
import { Plus, Users, Trophy, Target } from "lucide-react";

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
      <div className="stagger-in grid grid-cols-3 gap-4 mb-5">
        <StatCard icon={Users} label="Total leads" value={String(customers.length)} tone="forest" />
        <StatCard icon={Trophy} label="Won" value={String(wonCount)} tone="gold" />
        <StatCard icon={Target} label="Win rate" value={`${winRate.toFixed(0)}%`} tone="ice" />
      </div>

      <p className="text-xs text-forest-950/50 mb-4">
        Drag a card between columns to move a customer through your sales process.
      </p>
      <PipelineBoard
        customers={customers.map((c) => ({ ...c, updatedAt: c.updatedAt.toISOString() }))}
      />
    </main>
  );
}
