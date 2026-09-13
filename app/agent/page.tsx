import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import AgentChat from "@/components/AgentChat";
import { Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AgentPage() {
  const messages = await prisma.agentMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  messages.reverse();

  return (
    <main className="p-6 md:p-8">
      <PageHeader
        title="AI Assistant"
        subtitle="Ask questions, upload photos for quick pricing, or tell it what to do."
        icon={Sparkles}
      />
      <AgentChat
        initialMessages={messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          imageUrl: m.imageUrl,
          toolCalls: m.toolCalls,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}
