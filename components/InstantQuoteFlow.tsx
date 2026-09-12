"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, CheckCircle2, Leaf, Snowflake, MapPin } from "lucide-react";
import PropertyMap from "@/components/PropertyMapField";
import {
  approveInstantQuote,
  declineInstantQuote,
  submitManualReviewLead,
} from "@/app/actions/instantQuote";
import {
  estimateInstantQuote,
  needsManualQuote,
  SERVICE_LABELS,
  type InstantQuoteEstimate,
  type InstantQuoteService,
} from "@/lib/pricing";

const inputClass =
  "w-full rounded-lg border border-border-subtle bg-white px-3 py-2.5 text-sm text-forest-950 placeholder:text-forest-950/35 focus:outline-none focus:ring-2 focus:ring-gold-500";

type Step = "details" | "measure" | "quote" | "done";

export default function InstantQuoteFlow() {
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState<Step>("details");
  const [service, setService] = useState<InstantQuoteService>("mowing");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [quote, setQuote] = useState<InstantQuoteEstimate | null>(null);
  const [manualNeeded, setManualNeeded] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ title: string; body: string } | null>(null);

  async function handleFindAddress() {
    setError("");
    const fd = new FormData(formRef.current!);
    const addressLine = String(fd.get("addressLine") ?? "").trim();
    const city = String(fd.get("city") ?? "").trim();
    const state = String(fd.get("state") ?? "VT").trim();
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    if (!name) return setError("Enter your name.");
    if (!email && !phone) return setError("Add an email or phone number.");
    if (!addressLine) return setError("Enter your address.");

    setGeocoding(true);
    try {
      const q = [addressLine, city, state].filter(Boolean).join(", ");
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      const first = data.results?.[0];
      if (!first) {
        setError("Couldn't find that address on the map — double check it and try again.");
        return;
      }
      setCoords({ lat: first.lat, lng: first.lng });
      setStep("measure");
    } catch {
      setError("Something went wrong looking up that address — try again.");
    } finally {
      setGeocoding(false);
    }
  }

  function handleGetPrice() {
    setError("");
    const fd = new FormData(formRef.current!);
    let sqft = 0;
    try {
      const parsed = JSON.parse(String(fd.get("mapPayload") ?? "{}"));
      sqft = service === "mowing" ? parsed.lawnSqft ?? 0 : parsed.driveSqft ?? 0;
    } catch {
      sqft = 0;
    }
    if (!sqft || sqft <= 0) {
      setError(
        `Trace your ${service === "mowing" ? "lawn" : "driveway"} on the map first — pick "${
          service === "mowing" ? "Lawn" : "Driveway"
        }" from the dropdown, then "+ Measure area".`
      );
      return;
    }
    if (needsManualQuote(sqft)) {
      setManualNeeded(true);
      setQuote(null);
    } else {
      setManualNeeded(false);
      setQuote(estimateInstantQuote(service, sqft));
    }
    setStep("quote");
  }

  function run(action: (fd: FormData) => Promise<{ ok: true; price?: number }>, onOk: (price?: number) => void) {
    setError("");
    startTransition(async () => {
      try {
        const r = await action(new FormData(formRef.current!));
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
          onClick={handleFindAddress}
          disabled={geocoding}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-forest-700 px-5 py-3 text-sm font-semibold text-white hover:bg-forest-800 disabled:opacity-60"
        >
          {geocoding && <Loader2 size={16} className="animate-spin" />}
          {geocoding ? "Finding your property…" : "Find my property on the map"}
        </button>
      </div>

      {/* Step: measure */}
      <div className={step === "measure" ? "space-y-4" : "hidden"}>
        <div className="rounded-lg bg-forest-100/60 px-4 py-3 text-sm text-forest-950/80 flex items-start gap-2">
          <MapPin size={16} className="mt-0.5 flex-shrink-0 text-forest-700" />
          <span>
            Trace your <strong>{service === "mowing" ? "lawn" : "driveway"}</strong> on the
            satellite map below: pick &ldquo;{service === "mowing" ? "Lawn" : "Driveway"}&rdquo;
            from the dropdown, click &ldquo;+ Measure area&rdquo;, then click around its edges and
            hit &ldquo;Finish shape.&rdquo;
          </span>
        </div>
        {coords && (
          <PropertyMap
            initialLat={coords.lat}
            initialLng={coords.lng}
            initialMeasurements={[]}
            hiddenInputName="mapPayload"
          />
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStep("details")}
            className="rounded-lg border border-border-subtle px-4 py-2.5 text-sm font-medium hover:bg-surface-muted"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleGetPrice}
            className="flex-1 rounded-lg bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-800"
          >
            Get my price
          </button>
        </div>
      </div>

      {/* Step: quote */}
      <div className={step === "quote" ? "space-y-5" : "hidden"}>
        {manualNeeded ? (
          <div className="rounded-xl border border-gold-500/40 bg-gold-100/50 p-5 text-sm space-y-3">
            <p className="font-semibold text-forest-950">
              Your property&rsquo;s a bit bigger than we can price instantly.
            </p>
            <p className="text-forest-950/70">
              No problem — hit the button below and we&rsquo;ll come take a look and send you a real
              quote, usually within a day or two.
            </p>
            {error && <p className="text-danger">{error}</p>}
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(submitManualReviewLead, () =>
                  setResultAndStep(
                    "Got it!",
                    "We'll take a look at your property and get you a quote personally — usually within a day or two."
                  )
                )
              }
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-forest-700 px-5 py-3 text-sm font-semibold text-white hover:bg-forest-800 disabled:opacity-60"
            >
              {pending && <Loader2 size={16} className="animate-spin" />}
              Request a personal quote
            </button>
          </div>
        ) : (
          quote && (
            <div className="rounded-xl border border-forest-700/30 bg-forest-700/5 p-5 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-forest-950/50">
                  Your instant quote
                </p>
                <p className="text-3xl font-bold text-forest-950">
                  ${quote.price}
                  <span className="text-base font-medium text-forest-950/50">/visit</span>
                </p>
                <p className="mt-1 text-sm text-forest-950/60">
                  {SERVICE_LABELS[quote.service]} · {quote.sqft.toLocaleString()} sq ft · about{" "}
                  {quote.minutes} min per visit
                </p>
                <p className="mt-1 text-xs text-forest-950/45">
                  {quote.service === "mowing"
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
                    run(approveInstantQuote, (price) =>
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
                    run(declineInstantQuote, () =>
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
          )
        )}
        <button
          type="button"
          onClick={() => setStep("measure")}
          className="text-xs text-forest-950/50 hover:underline"
        >
          ← Back to measuring
        </button>
      </div>

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
