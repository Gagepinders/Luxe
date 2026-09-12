"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { submitGeneralInquiry } from "@/app/actions/generalInquiry";

const inputClass =
  "w-full rounded-lg border border-border-subtle bg-white px-3 py-2.5 text-sm text-forest-950 placeholder:text-forest-950/35 focus:outline-none focus:ring-2 focus:ring-gold-500";

export default function GeneralInquiryForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await submitGeneralInquiry(new FormData(formRef.current!));
        setSent(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong — try again.");
      }
    });
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-forest-700/30 bg-forest-700/5 p-6 text-center space-y-2">
        <CheckCircle2 size={28} className="mx-auto text-forest-700" />
        <p className="font-semibold text-forest-950">Thanks — we got it!</p>
        <p className="text-sm text-forest-950/70">We&rsquo;ll be in touch soon.</p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <input name="name" required placeholder="Your name" className={inputClass} />
        <input name="phone" type="tel" placeholder="Phone" className={inputClass} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <input name="email" type="email" placeholder="Email" className={inputClass} />
        <input name="addressLine" placeholder="Address (optional)" className={inputClass} />
      </div>
      <textarea
        name="message"
        rows={3}
        placeholder="What do you need help with?"
        className={inputClass}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-lg border border-forest-700 px-5 py-2.5 text-sm font-semibold text-forest-700 hover:bg-forest-700 hover:text-white disabled:opacity-60"
      >
        {pending && <Loader2 size={16} className="animate-spin" />}
        Send message
      </button>
    </form>
  );
}
