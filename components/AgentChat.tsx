"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { Send, Paperclip, X, Sparkles, CheckCircle2, User, Trash2 } from "lucide-react";

export type AgentChatMessage = {
  id: string;
  role: string;
  content: string;
  imageUrl: string | null;
  toolCalls: string | null;
  createdAt: string;
};

type ToolCallSummary = { name: string; summary: string; href?: string };

const SUGGESTIONS = [
  "How much should I charge to fill this bed with mulch?",
  "Go quote 22 Pinecrest Dr",
  "What's on my plate today?",
  "Remind me to order more mulch",
];

const MAX_IMAGES = 6;

// Older messages stored a single filename in imageUrl; multi-photo messages
// store a JSON array of filenames/blob URLs. Handle both transparently.
function parseImageUrls(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // not JSON — a plain single filename/URL from before multi-photo support
  }
  return [raw];
}

function resolveImageSrc(url: string) {
  return url.startsWith("blob:") ? url : `/api/uploads/${url}`;
}

const CLIENT_MAX_DIMENSION = 1600;
const CLIENT_JPEG_QUALITY = 0.85;

// Full-resolution phone photos run 8-13MB each — fine for one, but a batch
// of several blows past what the server's proxy will even accept as a
// request body (it errors out before our own resize step ever runs). Shrink
// on-device first so uploads stay small and fast regardless of how many
// photos are attached. Formats the browser can't decode (some Android HEIC
// cases) just pass through unchanged — the server's heic-convert/sharp
// pipeline still handles those as a fallback.
async function compressImageFile(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, CLIENT_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", CLIENT_JPEG_QUALITY)
    );
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export default function AgentChat({ initialMessages }: { initialMessages: AgentChatMessage[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).slice(0, MAX_IMAGES - imageFiles.length);
    if (files.length === 0) return;
    setCompressing(true);
    try {
      const compressed = await Promise.all(files.map(compressImageFile));
      setImageFiles((prev) => [...prev, ...compressed]);
      setImagePreviews((prev) => [...prev, ...compressed.map((f) => URL.createObjectURL(f))]);
    } finally {
      setCompressing(false);
    }
  }

  function removeImage(index: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function clearConversation() {
    if (!confirm("Clear the whole conversation? This can't be undone.")) return;
    await fetch("/api/agent/chat", { method: "DELETE" });
    setMessages([]);
  }

  async function send(text: string, files: File[]) {
    if (!text.trim() && files.length === 0) return;

    const optimisticUrls = files.map((f) => URL.createObjectURL(f));
    const optimisticUser: AgentChatMessage = {
      id: `local-${nextId.current++}`,
      role: "user",
      content: text || "(photo)",
      imageUrl: optimisticUrls.length > 0 ? JSON.stringify(optimisticUrls) : null,
      toolCalls: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setInput("");
    setImageFiles([]);
    setImagePreviews([]);
    setSending(true);

    try {
      const formData = new FormData();
      formData.set("message", text);
      for (const file of files) formData.append("images", file);

      const res = await fetch("/api/agent/chat", { method: "POST", body: formData });
      const data = await res.json();

      const assistantMessage: AgentChatMessage = {
        id: `local-${nextId.current++}`,
        role: "assistant",
        content: data.reply ?? "Sorry, something went wrong.",
        imageUrl: null,
        toolCalls: data.toolCalls?.length ? JSON.stringify(data.toolCalls) : null,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${nextId.current++}`,
          role: "assistant",
          content: "Couldn't reach the server — check your connection and try again.",
          imageUrl: null,
          toolCalls: null,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card flex flex-col h-[calc(100vh-13rem)] overflow-hidden">
      {messages.length > 0 && (
        <div className="flex items-center justify-end border-b border-border-subtle px-4 py-2">
          <button
            onClick={clearConversation}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-forest-950/50 hover:bg-danger-100 hover:text-danger"
          >
            <Trash2 size={12} /> Clear conversation
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 px-6">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-forest-600 to-forest-800 text-white shadow-[0_4px_14px_-4px_rgba(13,31,20,0.45)]">
              <Sparkles size={24} />
            </span>
            <div>
              <p className="font-medium text-forest-950">Ask me anything about the business</p>
              <p className="text-sm text-forest-950/55 mt-1 max-w-sm">
                Upload a photo for a quick price estimate, ask me to draft or send a quote, check
                today&apos;s schedule, or add a to-do.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s, [])}
                  className="rounded-full border border-border-subtle px-3 py-1.5 text-xs font-medium text-forest-950/70 hover:bg-surface-muted"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <ChatBubble key={m.id} message={m} />
        ))}

        {sending && (
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-forest-600 to-forest-800 text-white">
              <Sparkles size={13} />
            </span>
            <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-surface-muted px-4 py-3">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-forest-950/40 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-forest-950/40 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-forest-950/40" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border-subtle p-3.5">
        {imagePreviews.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-2">
            {imagePreviews.map((preview, i) => (
              <div key={preview} className="relative inline-block">
                <img src={preview} alt="Attached" className="h-16 w-16 rounded-lg object-cover border border-border-subtle" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-forest-950 text-white hover:bg-forest-800"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input, imageFiles);
          }}
          className="flex items-end gap-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || compressing || imageFiles.length >= MAX_IMAGES}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-border-subtle text-forest-950/60 hover:bg-surface-muted disabled:opacity-50"
            title={imageFiles.length >= MAX_IMAGES ? `Up to ${MAX_IMAGES} photos at a time` : "Attach photos"}
          >
            <Paperclip size={17} />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input, imageFiles);
              }
            }}
            rows={1}
            placeholder={compressing ? "Processing photos…" : "Ask a question, or say what you need done…"}
            disabled={sending}
            className="flex-1 resize-none rounded-lg border border-border-subtle bg-surface px-3 py-2.5 text-sm text-forest-950 shadow-sm shadow-black/[0.02] focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-forest-500/40 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || compressing || (!input.trim() && imageFiles.length === 0)}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-forest-600 to-forest-700 text-white shadow-sm shadow-forest-900/20 hover:from-forest-700 hover:to-forest-800 disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: AgentChatMessage }) {
  const isUser = message.role === "user";
  const toolCalls: ToolCallSummary[] = message.toolCalls ? JSON.parse(message.toolCalls) : [];

  if (isUser) {
    const imageUrls = parseImageUrls(message.imageUrl);
    return (
      <div className="flex justify-end">
        <div className="flex items-end gap-2 max-w-[80%] flex-row-reverse">
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-forest-950/10 text-forest-950/50">
            <User size={13} />
          </span>
          <div className="rounded-2xl rounded-tr-sm bg-forest-700 px-4 py-2.5 text-sm text-white">
            {imageUrls.length > 0 && (
              <div
                className={
                  imageUrls.length === 1
                    ? "mb-2"
                    : "mb-2 grid grid-cols-2 gap-1.5"
                }
              >
                {imageUrls.map((url) => (
                  <img
                    key={url}
                    src={resolveImageSrc(url)}
                    alt="Attached"
                    className={
                      imageUrls.length === 1
                        ? "max-h-48 rounded-lg object-cover"
                        : "h-24 w-full rounded-lg object-cover"
                    }
                  />
                ))}
              </div>
            )}
            {message.content !== "(photo)" && <p className="whitespace-pre-wrap">{message.content}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="flex items-start gap-2.5 max-w-[85%]">
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-forest-600 to-forest-800 text-white">
          <Sparkles size={13} />
        </span>
        <div className="space-y-2">
          <div className="rounded-2xl rounded-tl-sm bg-surface-muted px-4 py-2.5 text-sm text-forest-950">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          {toolCalls.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {toolCalls.map((t, i) =>
                t.href ? (
                  <Link
                    key={i}
                    href={t.href}
                    className="flex items-center gap-1.5 rounded-full bg-forest-100 px-2.5 py-1 text-xs font-medium text-forest-700 hover:bg-forest-100/70"
                  >
                    <CheckCircle2 size={12} /> {t.summary}
                  </Link>
                ) : (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 rounded-full bg-forest-100 px-2.5 py-1 text-xs font-medium text-forest-700"
                  >
                    <CheckCircle2 size={12} /> {t.summary}
                  </span>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
