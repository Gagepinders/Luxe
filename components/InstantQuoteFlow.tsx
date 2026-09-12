"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, CheckCircle2, Leaf, Snowflake } from "lucide-react";
import {
  requestInstantQuote,
  approveMatchedQuote,
  declineMatchedQuote,
} from "@/app/actions/instantQuote";
import {
  SERVICE_LABELS,
  type InstantQuoteEstimate,
  type InstantQuoteService,
} from "@/lib/pricing";

const inputClass =
  "w-full rounded-lg border border-border-subtle bg-white px-3 py-2.5 text-sm text-forest-950 placeholder:text-forest-950/35 focus:outline-none focus:ring-2 focus:ring-gold-500";

type Step = "details" | "quoted" | "pending" | "done";

export default function InstantQuoteFlow() {
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState<Step>("details");
  const [service, setService] = useState<InstantQuoteService>("mowing");
  const [estimate, setEstimate] = useState<InstantQuoteEstimate | null>(null);
  const [propertyId, setPropertyId] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ title: string; body: string } | null>(null);

  function handleSubmitDetails() {
    setError("");
    const fd = new FormData(formRef.current!);
    if (!String(fd.get("name") ?? "").trim()) return setError("Enter your name.");
    if (!String(fd.get("email") ?? "").trim() && !String(fd.get("phone") ?? "").trim()) {
      return setError("Add an email or phone number.");
    }
    if (!String(fd.get("addressLine") ?? "").trim()) return setError("Enter your address.");

    startTransition(async () => {
      try {
        const r = await requestInstantQuote(fd);
        if (r.kind === "quoted") {
          setEstimate(r.estimate);
          setPropertyId(r.propertyId);
          setStep("quoted");
        } else {
          setStep("pending");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong — try again.");
      }
    });
  }

  function run(action: (fd: FormData) => Promise<{ ok: true; price?: number }>, onOk: (price?: number) => void) {
    setError("");
    startTransition(async () => {
      try {
        const fd = new FormData(formRef.current!);
        fd.set("propertyId", propertyId);
        const r = await action(fd);
        onOk(r.price);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong — try again.");
      }
    });
  }

  return (
    <form ref={formRef} className="space-y-5">
      <input type="hidden" name="service" value={service} />

      {/* Step: details */}
      <div className={step === "details" ? "space-y-5" : "hidden"}>
        <div>
          <p className="text-sm font-semibold text-forest-950 mb-2">What do you need?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setService("mowing")}
              className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-4 text-sm font-medium transition-colors ${
                service === "mowing"
                  ? "border-forest-700 bg-forest-700/5 text-forest-950"
                  : "border-border-subtle text-forest-950/60 hover:border-forest-700/40"
              }`}
            >
              <Leaf size={22} className="text-forest-700" />
              Lawn mowing
            </button>
            <button
              type="button"
              onClick={() => setService("plowing")}
              className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-4 text-sm font-medium transition-colors ${
                service === "plowing"
                  ? "border-ice-600 bg-ice-100/60 text-forest-950"
                  : "border-border-subtle text-forest-950/60 hover:border-ice-600/40"
              }`}
            >
              <Snowflake size={22} className="text-ice-600" />
              Driveway plowing
            </button>
          </div>
          <p className="mt-2 text-xs text-forest-950/45">
            Bigger properties, mulch, cleanups, or garden work? Skip ahead and{" "}
            <a href="#contact-fallback" className="underline">
              just send us a message
            </a>{" "}
            instead — we&rsquo;ll quote it personally.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <input name="name" required placeholder="Your name" className={inputClass} />
          <input name="phone" type="tel" placeholder="Phone" className={inputClass} />
        </div>
        <input name="email" type="email" placeholder="Email" className={inputClass} />

        <div className="space-y-3">
          <input name="addressLine" required placeholder="Street address" className={inputClass} />
          <div className="grid grid-cols-3 gap-3">
            <input name="city" placeholder="City" className={`col-span-2 ${inputClass}`} />
            <input name="state" defaultValue="VT" className={inputClass} />
          </div>
          <input name="zip" placeholder="Zip" className={inputClass} />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="button"
          onClick={handleSubmitDetails}
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-forest-700 px-5 py-3 text-sm font-semibold text-white hover:bg-forest-800 disabled:opacity-60"
        >
          {pending && <Loader2 size={16} className="animate-spin" />}
          {pending ? "Checking your address…" : "Get my price"}
        </button>
      </div>

      {/* Step: quoted — an already-measured property, so this is a real price */}
      {step === "quoted" && estimate && (
        <div className="rounded-xl border border-forest-700/30 bg-forest-700/5 p-5 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-forest-950/50">Your instant quote</p>
            <p className="text-3xl font-bold text-forest-950">
              ${estimate.price}
              <span className="text-base font-medium text-forest-950/50">/visit</span>
            </p>
            <p className="mt-1 text-sm text-forest-950/60">
              {SERVICE_LABELS[estimate.service]} · about {estimate.minutes} min per visit
            </p>
            <p className="mt-1 text-xs text-forest-950/45">
              {estimate.service === "mowing"
                ? "Weekly during the growing season, starting this week."
                : "Billed per storm we plow — you're added to the active snow list."}
            </p>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(approveMatchedQuote, (price) =>
                  setResultAndStep(
                    "You're all set!",
                    `You're booked at $${price}/visit. Check your email for confirmation — we'll be in touch to schedule your first visit.`
                  )
                )
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-forest-700 px-5 py-3 text-sm font-semibold text-white hover:bg-forest-800 disabled:opacity-60"
            >
              {pending && <Loader2 size={16} className="animate-spin" />}
              Sign me up
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(declineMatchedQuote, () =>
                  setResultAndStep(
                    "No problem!",
                    "Thanks for checking us out — come back anytime if you change your mind."
                  )
                )
              }
              className="rounded-lg border border-border-subtle px-5 py-3 text-sm font-medium text-forest-950/70 hover:bg-surface-muted disabled:opacity-60"
            >
              No thanks
            </button>
          </div>
        </div>
      )}

      {/* Step: pending — no measurement on file yet, so no instant number */}
      {step === "pending" && (
        <div className="rounded-xl border border-gold-500/40 bg-gold-100/50 p-6 text-center space-y-2">
          <CheckCircle2 size={28} className="mx-auto text-forest-700" />
          <p className="font-semibold text-forest-950">Thanks — we&rsquo;ve got your request!</p>
          <p className="text-sm text-forest-950/70">
            We&rsquo;ll take a quick look at your property and text or email you a price — usually
            within a few hours.
          </p>
        </div>
      )}

      {/* Step: done */}
      {step === "done" && result && (
        <div className="rounded-xl border border-forest-700/30 bg-forest-700/5 p-6 text-center space-y-2">
          <CheckCircle2 size={32} className="mx-auto text-forest-700" />
          <p className="text-lg font-semibold text-forest-950">{result.title}</p>
          <p className="text-sm text-forest-950/70">{result.body}</p>
        </div>
      )}
    </form>
  );

  function setResultAndStep(title: string, body: string) {
    setResult({ title, body });
    setStep("done");
  }
}
