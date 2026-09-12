import type { Metadata } from "next";
import { getCompanyProfile } from "@/lib/companyProfile";
import InstantQuoteFlow from "@/components/InstantQuoteFlow";
import GeneralInquiryForm from "@/components/GeneralInquiryForm";
import { Leaf, Star, Clock, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const company = await getCompanyProfile();
  const title = "Instant Lawn Mowing & Plowing Quote | Luxe Landscape & Snow";
  const description =
    `Get an instant price for lawn mowing or driveway plowing in ${company.serviceArea}. ` +
    `Trace your property on the map and get a real quote in under a minute — no waiting for a callback.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    alternates: { canonical: "/quote" },
  };
}

export default async function QuotePage() {
  const company = await getCompanyProfile();

  return (
    <main className="min-h-screen bg-surface-muted">
      <header className="bg-forest-950 text-white">
        <div className="mx-auto max-w-3xl px-4 py-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500 text-forest-950">
            <Leaf size={20} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{company.name}</p>
            <p className="text-[11px] uppercase tracking-wide text-forest-100/60">
              {company.tagline}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        <section className="text-center space-y-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-forest-950">
            Get an instant price — no waiting for a callback
          </h1>
          <p className="text-forest-950/60 max-w-xl mx-auto">
            Trace your lawn or driveway on the map and see exactly what your visit costs in under
            a minute. Approve it and you&rsquo;re booked — no phone tag, no back-and-forth.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-forest-950/50 pt-1">
            <span className="flex items-center gap-1">
              <Star size={13} className="text-gold-500" fill="currentColor" /> 5.0 rated locally
            </span>
            <span className="flex items-center gap-1">
              <Clock size={13} /> Priced in under a minute
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck size={13} /> Serving {company.serviceArea}
            </span>
          </div>
        </section>

        <section className="card bg-white rounded-2xl shadow-sm border border-border-subtle p-5 sm:p-7">
          <InstantQuoteFlow />
        </section>

        <section id="contact-fallback" className="space-y-3">
          <div className="text-center">
            <h2 className="font-semibold text-forest-950">Need something else?</h2>
            <p className="text-sm text-forest-950/55">
              Landscaping, mulch, cleanups, or a bigger property — send us a message and we&rsquo;ll get
              back to you personally.
            </p>
          </div>
          <div className="card bg-white rounded-2xl border border-border-subtle p-5">
            <GeneralInquiryForm />
          </div>
        </section>

        <footer className="text-center text-xs text-forest-950/40 pt-4">
          {company.name} · {company.city}, {company.state} · {company.phone}
        </footer>
      </div>
    </main>
  );
}
