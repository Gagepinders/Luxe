import path from "path";
import fs from "fs/promises";
import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic";
import { buildAgentTools, type ToolCallSummary } from "@/lib/agentTools";
import { ensureUploadsDir, safeExtension } from "@/lib/uploads";

export const dynamic = "force-dynamic";

const IMAGE_MEDIA_TYPES: Record<string, "image/jpeg" | "image/png" | "image/webp" | "image/gif"> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const SYSTEM_PROMPT = `You are the AI assistant built into Luxe Landscape & Snow's CRM, helping the owner run a landscaping and snow-removal business in Vermont. You are talking to the business owner or their staff, not a customer.

You have tools to search customers and properties, check real service rates and material stock, get a snapshot of today's business, draft and send quotes, and add to-dos. Use them — never invent a customer, property, price, or measurement. Always look an entity up before acting on it.

When shown a photo of a job site (e.g. a mulch bed, a lawn) and asked for a price:
- Give a rough visual size estimate (dimensions or sqft) reasoned from what's visible in the photo — call out that it's a visual estimate for a phone quote, not a measurement.
- Pull the actual configured rate with get_service_rates and show the math (estimated quantity × rate = price), rather than naming a price out of nowhere.
- If the photo doesn't give you enough to even guess (too zoomed in, no scale reference), say so and ask for a wider shot or the property address instead of making something up.

Creating a quote (create_quote) only drafts it — nothing is sent to the customer. Only call send_quote_to_customer when the user clearly asks to send or email a quote. "Quote this property" means draft it; "send this to [name]" means send it.

Be concise — this is a business owner reading on their phone, often between jobs. Skip preamble, lead with the answer or the result.`;

async function saveUploadedImage(file: File) {
  const dir = await ensureUploadsDir();
  const ext = safeExtension(file.name);
  const filename = `${randomBytes(12).toString("hex")}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, filename), buffer);
  return { filename, buffer, ext };
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const message = String(formData.get("message") ?? "").trim();
  const imageFile = formData.get("image");
  const hasImage = imageFile instanceof File && imageFile.size > 0;

  if (!message && !hasImage) {
    return NextResponse.json({ error: "Message or photo required." }, { status: 400 });
  }

  let imageFilename: string | null = null;
  let imageBuffer: Buffer | null = null;
  let imageMediaType: string | null = null;
  if (hasImage) {
    const saved = await saveUploadedImage(imageFile as File);
    imageFilename = saved.filename;
    imageBuffer = saved.buffer;
    imageMediaType = IMAGE_MEDIA_TYPES[saved.ext] ?? "image/jpeg";
  }

  const history = await prisma.agentMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  history.reverse();

  await prisma.agentMessage.create({
    data: { role: "user", content: message || "(photo)", imageUrl: imageFilename },
  });

  const client = getAnthropicClient();
  if (!client) {
    const reply =
      "The AI assistant isn't set up yet — an ANTHROPIC_API_KEY needs to be added to this deployment's environment variables before I can respond. Ask whoever manages the Railway project to add one from console.anthropic.com.";
    await prisma.agentMessage.create({ data: { role: "assistant", content: reply } });
    return NextResponse.json({ reply, toolCalls: [] });
  }

  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  const userContent: Anthropic.MessageParam["content"] = [];
  if (imageBuffer && imageMediaType) {
    userContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: imageMediaType as "image/jpeg",
        data: imageBuffer.toString("base64"),
      },
    });
  }
  userContent.push({ type: "text", text: message || "What should I charge for this?" });
  messages.push({ role: "user", content: userContent });

  const toolLog: ToolCallSummary[] = [];
  const tools = buildAgentTools(toolLog);

  let replyText = "Sorry, something went wrong and I couldn't respond.";
  try {
    const finalMessage = await client.beta.messages.toolRunner({
      model: "claude-opus-5",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      thinking: { type: "adaptive" },
      tools,
      messages,
    });

    const textBlocks = finalMessage.content.filter(
      (b): b is Anthropic.Beta.BetaTextBlock => b.type === "text"
    );
    replyText = textBlocks.map((b) => b.text).join("\n\n") || "Done.";
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      replyText = "The ANTHROPIC_API_KEY for this deployment looks invalid — check it in Railway.";
    } else if (error instanceof Anthropic.RateLimitError) {
      replyText = "Hit a rate limit talking to Claude — try again in a moment.";
    } else if (error instanceof Anthropic.APIError) {
      replyText = `Claude API error: ${error.message}`;
    } else {
      replyText = "Something went wrong reaching the AI assistant. Try again.";
    }
  }

  await prisma.agentMessage.create({
    data: {
      role: "assistant",
      content: replyText,
      toolCalls: toolLog.length > 0 ? JSON.stringify(toolLog) : null,
    },
  });

  return NextResponse.json({ reply: replyText, toolCalls: toolLog, imageUrl: imageFilename });
}
