// Instant-quote pricing for the public "get a quote" funnel. Solo-operator
// time estimates in, per-visit price out — no manual involved.
//
// Rates and pace assumptions below came directly from the business owner
// and are the only inputs that should ever need tuning as reality proves
// them wrong; everything else here is pure arithmetic on top of them.

export type InstantQuoteService = "mowing" | "plowing";

export const MOWING_RATE_PER_HOUR = 100;
export const PLOWING_RATE_PER_HOUR = 150;

// Minutes to fully service 1,000 sq ft solo — mowing includes trim/edge/blow,
// plowing assumes a typical storm.
export const MOWING_MINUTES_PER_1000_SQFT = 15;
export const PLOWING_MINUTES_PER_1000_SQFT = 8;

// Floor price per visit so a tiny property never gets a silly-cheap instant
// quote. Not something the owner specified — a reasonable default, easy to
// change here if it's off.
export const MOWING_MIN_CHARGE = 45;
export const PLOWING_MIN_CHARGE = 50;

// Above this, the site stops offering an instant price and captures the lead
// for an in-person visit instead. ~1/2 acre.
export const INSTANT_QUOTE_MAX_SQFT = 21780;

export type InstantQuoteEstimate = {
  service: InstantQuoteService;
  sqft: number;
  minutes: number;
  ratePerHour: number;
  price: number;
};

export function estimateInstantQuote(
  service: InstantQuoteService,
  sqft: number
): InstantQuoteEstimate {
  const minutesPer1000 =
    service === "mowing" ? MOWING_MINUTES_PER_1000_SQFT : PLOWING_MINUTES_PER_1000_SQFT;
  const ratePerHour = service === "mowing" ? MOWING_RATE_PER_HOUR : PLOWING_RATE_PER_HOUR;
  const minCharge = service === "mowing" ? MOWING_MIN_CHARGE : PLOWING_MIN_CHARGE;

  const minutes = (sqft / 1000) * minutesPer1000;
  const rawPrice = (minutes / 60) * ratePerHour;
  const price = Math.max(minCharge, Math.round(rawPrice / 5) * 5);

  return { service, sqft: Math.round(sqft), minutes: Math.round(minutes), ratePerHour, price };
}

export function needsManualQuote(sqft: number) {
  return sqft <= 0 || sqft > INSTANT_QUOTE_MAX_SQFT;
}

export const SERVICE_LABELS: Record<InstantQuoteService, string> = {
  mowing: "Lawn mowing",
  plowing: "Driveway plowing",
};
