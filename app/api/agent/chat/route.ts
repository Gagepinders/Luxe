import path from "path";
import fs from "fs/promises";
import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import heicConvert from "heic-convert";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic";
import { buildAgentTools, type ToolCallSummary } from "@/lib/agentTools";
import { ensureUploadsDir, safeExtension } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export async function DELETE() {
  await prisma.agentMessage.deleteMany({});
  return NextResponse.json({ ok: true });
}

const IMAGE_MEDIA_TYPES: Record<string, "image/jpeg" | "image/png" | "image/webp" | "image/gif"> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const SYSTEM_PROMPT = `You are the AI assistant built into Luxe Landscape & Snow's CRM, helping the owner run a landscaping and snow-removal business in Vermont. You are talking to the business owner or their staff, not a customer.

You have tools to search customers and properties, check real service rates and material stock, get a snapshot of today's business (same list the To-Dos page shows — quote follow-ups, today's jobs, overdue invoices, low stock, overdue equipment service), draft and send quotes, and add to-dos. Use them — never invent a customer, property, price, or measurement. Always look an entity up before acting on it.

PRICING FROM A PHOTO — this is the core of how this business wants estimates done, follow it exactly. The owner has said past estimates ran too high — the guidance below is written to correct that, so follow the anti-inflation points as strictly as the math itself:
- Never use a property's stored measurements (lawnSqft, mulchSqft, driveSqft, walkwaySqft from get_customer/search_properties) as the basis for a photo price. Those numbers can be stale or for a different area than what's actually in the photo. Price off what you can actually see, every time — even for an existing customer whose property you could look up.
- Always pull the real rate via get_service_rates first and use it — never guess or estimate a dollar amount out of thin air, and never substitute a "typical market rate" for the business's own configured rate.
- Never pad a number "to be safe." Not square footage, not depth, not hours, not a flat rate. Estimate the single most likely real value and price off that. A quote that's too high loses the job before the owner ever gets a chance to look at it in person; a quote that's slightly low costs nothing since the owner can always adjust on-site. When genuinely unsure, say the estimate is rough rather than quietly rounding up to cover yourself.
- Square footage is the easiest thing to overestimate from a photo — there's no fixed scale, and a close-up shot makes beds look bigger than they are. Before sizing anything, find a real-world reference in the frame and size against it: a paver or paving stone (~16in), a standard door (~3ft wide), a driveway (~10-12ft wide), a mower (~2ft wide), a shovel (~4ft). State what you calibrated against. If there's truly nothing to calibrate with, say the estimate is rough and give your single best number anyway — don't inflate it as a hedge.
- Mulch (Mulch Installation, priced per yard installed): estimate the bed's square footage from the photo (calibrate per above). For depth, default to 2 inches — that's a normal top-off of a bed that already has some mulch in it, which is the common case. Only use 3-4 inches if the photo clearly shows bare dirt / a brand-new bed with nothing in it yet, or the user says it's a new install. Convert to cubic yards with sqft × (depth in inches / 12) ÷ 27, then round to the nearest half yard — round down when you're closer to the lower half-yard mark, not automatically up. Price = yards × rate. Show every step: sqft estimate (and what you calibrated against) → depth assumed and why → yards → × rate → total.
- Multiple photos in one message almost always means multiple separate beds or areas around the same property (e.g. "price mulch for all these beds") — never treat them as different angles of one bed unless the message says so or it's obviously the same spot. Price each photo on its own line with its own sqft → yards → total, then give a combined yards total and a combined price at the end. If it's genuinely ambiguous whether photos are separate beds or the same bed from different angles, ask.
- Flat-rate or per-visit services (e.g. Lawn Mowing) that aren't priced by yard or by hour: use the configured rate as-is. A photo is just confirmation it's a normal residential lot the flat rate already covers — it is not a basis for scaling the price up. Only charge above the flat rate when the lot is unambiguously outsized or overgrown well beyond a normal mow (e.g. clearly over an acre, or grass that's gone to seed and needs a first cut before regular mowing can start) — ordinary-looking obstacles, slopes, or a slightly bigger-than-average yard are NOT reasons to adjust. If you do adjust, say plainly why in concrete terms, not just "looks bigger."
- Hourly-priced work (e.g. Custom Project (Hourly)) with no clean unit like sqft or yards: estimate the hours a competent crew would actually take — not a padded worst case. Multiply by the hourly rate, then separately estimate any material cost involved (plants, stone, lumber, etc. — state your assumptions) and add it on top. Total = (hours × hourly rate) + materials.
- If a photo doesn't give you enough to even guess (too zoomed in, no scale reference), say so for that specific photo and ask for a wider shot instead of making something up — don't let one bad photo block pricing the others.

Creating a quote (create_quote) only drafts it — nothing is sent to the customer. Only call send_quote_to_customer when the user clearly asks to send or email a quote. "Quote this property" means draft it; "send this to [name]" means send it. When you do draft a quote from a photo estimate, still look up the right customer/property to attach it to (just not for the pricing math).

Be concise — this is a business owner reading on their phone, often between jobs. Skip preamble, lead with the answer or the result.

Reply in plain text only — this chat renders raw text, not markdown, so never use **bold**, #headers, or markdown-style "-"/"*" bullets. For a list, just put each item on its own line (optionally with a number like "1." or an em dash "—"), and use plain words instead of bold for emphasis.`;

// Claude rejects any single image over 10MB, and iPhones routinely produce
// 8-13MB photos (more once a HEIC gets re-encoded as JPEG below) — plus
// Claude internally downscales anything past ~1568px on the long edge
// before it even looks at it, so sending full camera resolution buys
// nothing but a slower upload and a real chance of hitting that limit.
const MAX_DIMENSION = 1568;

// iPhones save camera photos as HEIC by default. Claude's vision API only
// accepts JPEG/PNG/GIF/WEBP — sending HEIC bytes mislabeled as image/jpeg
// (the old behavior here) gets silently rejected by the API, and HEIC
// doesn't render in a browser <img> either, so the stored photo would look
// broken in the chat. Converting up front fixes both, and resizing after
// (every upload, not just HEIC) keeps every photo well under the size cap.
async function saveUploadedImage(file: File) {
  const dir = await ensureUploadsDir();
  const ext = safeExtension(file.name);
  let buffer = Buffer.from(await file.arrayBuffer());

  if (ext === ".heic" || ext === ".heif" || file.type === "image/heic" || file.type === "image/heif") {
    try {
      const converted = await heicConvert({ buffer, format: "JPEG", quality: 0.9 });
      buffer = Buffer.from(converted);
    } catch {
      throw new Error(
        "That photo is in a format I couldn't read (HEIC conversion failed). Try taking the photo with your camera set to 'Most Compatible' format, or send a regular JPEG/PNG."
      );
    }
  }

  try {
    buffer = await sharp(buffer)
      .rotate() // bake in EXIF orientation — otherwise a sideways phone photo stays sideways
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    throw new Error("Couldn't process that photo — try a different one.");
  }

  const filename = `${randomBytes(12).toString("hex")}.jpg`;
  await fs.writeFile(path.join(dir, filename), buffer);
  return { filename, buffer, ext: ".jpg" };
}

const MAX_IMAGES = 6;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const message = String(formData.get("message") ?? "").trim();
  const imageFiles = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, MAX_IMAGES);
  const hasImages = imageFiles.length > 0;

  if (!message && !hasImages) {
    return NextResponse.json({ error: "Message or photo required." }, { status: 400 });
  }

  const imageFilenames: string[] = [];
  const imageBlocks: { buffer: Buffer; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" }[] = [];
  if (hasImages) {
    try {
      for (const file of imageFiles) {
        const saved = await saveUploadedImage(file);
        imageFilenames.push(saved.filename);
        imageBlocks.push({ buffer: saved.buffer, mediaType: IMAGE_MEDIA_TYPES[saved.ext] ?? "image/jpeg" });
      }
    } catch (error) {
      console.error("[agent/chat] image upload failed:", error);
      const reply = error instanceof Error ? error.message : "Couldn't process that photo — try a different one.";
      return NextResponse.json({ reply, toolCalls: [] });
    }
  }

  const history = await prisma.agentMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  history.reverse();

  // One photo stores a plain filename (backward compatible with existing
  // rows); more than one stores a JSON array — parsed back out wherever
  // imageUrl is rendered.
  const imageUrlField =
    imageFilenames.length === 0 ? null : imageFilenames.length === 1 ? imageFilenames[0] : JSON.stringify(imageFilenames);

  await prisma.agentMessage.create({
    data: { role: "user", content: message || "(photo)", imageUrl: imageUrlField },
  });

  const client = getAnthropicClient();
  if (!client) {
    // Not persisted — this is a deployment-config status message, not a real
    // conversational turn, and saving it would have the assistant "reading
    // back" a stale outage notice to itself once a key is added later.
    const reply =
      "The AI assistant isn't set up yet — an ANTHROPIC_API_KEY needs to be added to this deployment's environment variables before I can respond. Ask whoever manages the Railway project to add one from console.anthropic.com.";
    return NextResponse.json({ reply, toolCalls: [] });
  }

  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  const userContent: Anthropic.MessageParam["content"] = [];
  for (const block of imageBlocks) {
    userContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: block.mediaType,
        data: block.buffer.toString("base64"),
      },
    });
  }
  userContent.push({
    type: "text",
    text:
      message ||
      (imageBlocks.length > 1 ? "What should I charge for each of these?" : "What should I charge for this?"),
  });
  messages.push({ role: "user", content: userContent });

  const toolLog: ToolCallSummary[] = [];
  const tools = buildAgentTools(toolLog);

  let replyText = "Sorry, something went wrong and I couldn't respond.";
  let requestFailed = false;
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
    requestFailed = true;
    console.error("[agent/chat] Claude request failed:", error);
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

  // A failed request isn't a real conversational turn — don't persist it, or
  // the next successful turn would see it in history and think it had just
  // said that itself (e.g. narrating a since-resolved "out of credits" error
  // back to the user as if it were still happening).
  if (!requestFailed) {
    await prisma.agentMessage.create({
      data: {
        role: "assistant",
        content: replyText,
        toolCalls: toolLog.length > 0 ? JSON.stringify(toolLog) : null,
      },
    });
  }

  return NextResponse.json({ reply: replyText, toolCalls: toolLog, imageUrl: imageUrlField });
}
