"use server";

import { prisma } from "@/lib/prisma";
import { getResendClient, getFromAddress, getReplyToAddress } from "@/lib/resend";
import { getCompanyProfile } from "@/lib/companyProfile";
import {
  estimateInstantQuote,
  needsManualQuote,
  SERVICE_LABELS,
  type InstantQuoteService,
} from "@/lib/pricing";

type MapPayload = {
  lat: number | null;
  lng: number | null;
  measurements: { id: string; label: string; type: string; sqft: number; points: [number, number][] }[];
  lawnSqft: number;
  driveSqft: number;
};

function parseMapPayload(raw: FormDataEntryValue | null): MapPayload {
  const empty: MapPayload = { lat: null, lng: null, measurements: [], lawnSqft: 0, driveSqft: 0 };
  if (!raw) return empty;
  try {
    return { ...empty, ...JSON.parse(String(raw)) };
  } catch {
    return empty;
  }
}

function readContactAndAddress(formData: FormData) {
  const service = String(formData.get("service") ?? "");
  if (service !== "mowing" && service !== "plowing") {
    throw new Error("Select a service.");
  }
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!name) throw new Error("Name is required.");
  if (!email && !phone) throw new Error("Add an email or phone number so we can confirm.");

  const addressLine = String(formData.get("addressLine") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "VT").trim();
  const zip = String(formData.get("zip") ?? "").trim();
  if (!addressLine) throw new Error("Address is required.");

  const map = parseMapPayload(formData.get("mapPayload"));
  const sqft = service === "mowing" ? map.lawnSqft : map.driveSqft;

  return {
    service: service as InstantQuoteService,
    name,
    email: email || null,
    phone: phone || null,
    addressLine,
    city,
    state,
    zip,
    lat: map.lat,
    lng: map.lng,
    sqft,
    measurements: JSON.stringify(map.measurements),
  };
}

async function findServiceType(service: InstantQuoteService) {
  const category = service === "mowing" ? "landscaping" : "snow_removal";
  const preferredName = service === "mowing" ? "Lawn Mowing" : "Snow Plowing";
  const byName = await prisma.serviceType.findFirst({ where: { name: preferredName } });
  if (byName) return byName;
  const anyInCategory = await prisma.serviceType.findFirst({ where: { category } });
  if (anyInCategory) return anyInCategory;
  return prisma.serviceType.create({
    data: { name: preferredName, category, defaultUnit: "visit", defaultRate: 0 },
  });
}

async function notifyOwner(subject: string, html: string) {
  const resend = getResendClient();
  if (!resend) return;
  const company = await getCompanyProfile();
  if (!company.email) return;
  await resend.emails.send({
    from: getFromAddress(),
    to: company.email,
    replyTo: getReplyToAddress(),
    subject,
    html,
  });
}

// Public action for oversized properties — the site never quotes a price,
// just captures the lead for a personal visit.
export async function submitManualReviewLead(formData: FormData) {
  const input = readContactAndAddress(formData);

  const customer = await prisma.customer.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      status: "lead",
      pipelineStage: "new",
      source: "instant_quote_manual_review",
      notes: `Requested an instant ${SERVICE_LABELS[input.service]} quote from the website — ${Math.round(
        input.sqft
      ).toLocaleString()} sq ft is above instant-pricing size, needs an in-person visit.`,
    },
  });
  await prisma.property.create({
    data: {
      customerId: customer.id,
      addressLine: input.addressLine,
      city: input.city,
      state: input.state,
      zip: input.zip,
      lat: input.lat,
      lng: input.lng,
      measurements: input.measurements,
      ...(input.service === "mowing" ? { lawnSqft: input.sqft } : { driveSqft: input.sqft }),
    },
  });
  await prisma.activity.create({
    data: {
      customerId: customer.id,
      type: "note",
      body: `New website lead — ${SERVICE_LABELS[input.service]}, ${Math.round(
        input.sqft
      ).toLocaleString()} sq ft, too large for instant pricing. Needs a visit to quote.`,
    },
  });

  await notifyOwner(
    `New lead needs a visit to quote — ${input.name}`,
    `<p>${input.name} requested a ${SERVICE_LABELS[input.service]} quote at ${input.addressLine} through the website.</p>
     <p>${Math.round(input.sqft).toLocaleString()} sq ft is above instant-pricing size, so no price was shown — go take a look and quote it manually in the CRM.</p>
     <p>Contact: ${input.email ?? ""} ${input.phone ?? ""}</p>`
  );

  return { ok: true as const };
}

// Customer clicked "Sign me up" on their instant quote. Recomputes the price
// server-side from the raw measurements — never trusts a price the client
// might have sent — then signs them up for real: a won quote plus a
// scheduled (or on-demand, for snow) job so they show up in the CRM exactly
// like a manually-entered customer would.
export async function approveInstantQuote(formData: FormData) {
  const input = readContactAndAddress(formData);
  if (needsManualQuote(input.sqft)) {
    throw new Error("This property is too large for instant pricing — submit for a personal visit instead.");
  }
  const quote = estimateInstantQuote(input.service, input.sqft);
  const serviceType = await findServiceType(input.service);
  const company = await getCompanyProfile();

  const customer = await prisma.customer.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      status: "active",
      pipelineStage: "won",
      source: `instant_quote_${input.service}`,
    },
  });
  const property = await prisma.property.create({
    data: {
      customerId: customer.id,
      addressLine: input.addressLine,
      city: input.city,
      state: input.state,
      zip: input.zip,
      lat: input.lat,
      lng: input.lng,
      measurements: input.measurements,
      ...(input.service === "mowing" ? { lawnSqft: input.sqft } : { driveSqft: input.sqft }),
    },
  });
  const dbQuote = await prisma.quote.create({
    data: {
      customerId: customer.id,
      propertyId: property.id,
      title: `Instant ${SERVICE_LABELS[input.service]} quote`,
      status: "won",
      sentAt: new Date(),
      decidedAt: new Date(),
      lineItems: {
        create: [
          {
            serviceTypeId: serviceType.id,
            description: SERVICE_LABELS[input.service],
            quantity: 1,
            unit: "visit",
            unitPrice: quote.price,
          },
        ],
      },
    },
  });

  const firstVisit = new Date();
  firstVisit.setDate(firstVisit.getDate() + (input.service === "mowing" ? 3 : 0));
  firstVisit.setHours(8, 0, 0, 0);

  await prisma.job.create({
    data: {
      customerId: customer.id,
      propertyId: property.id,
      quoteId: dbQuote.id,
      serviceTypeId: serviceType.id,
      title: SERVICE_LABELS[input.service],
      status: "scheduled",
      scheduledDate: firstVisit,
      price: quote.price,
      // Mowing signs up for a weekly season; plowing is "on demand" so the
      // existing snow-day dispatch tool picks this customer up automatically.
      recurrence: input.service === "mowing" ? "weekly" : "on_demand",
      notes: "Signed up through the website's instant quote tool.",
    },
  });

  await prisma.activity.create({
    data: {
      customerId: customer.id,
      type: "quote",
      body: `Signed up instantly through the website: ${SERVICE_LABELS[input.service]} at $${quote.price}/visit.`,
    },
  });

  if (input.email) {
    const resend = getResendClient();
    if (resend) {
      await resend.emails.send({
        from: getFromAddress(),
        to: input.email,
        replyTo: getReplyToAddress(),
        subject: `You're booked with ${company.name}!`,
        html: `
          <p>Hi ${input.name.split(" ")[0]},</p>
          <p>Thanks for signing up! Here's what you approved:</p>
          <p><strong>${SERVICE_LABELS[input.service]}</strong> at ${input.addressLine} — $${quote.price} per visit.</p>
          <p>We'll be in touch to confirm your first visit. Questions? Just reply to this email or call ${company.phone}.</p>
          <p>Thanks,<br>${company.name}</p>
        `,
      });
    }
  }

  await notifyOwner(
    `New instant sign-up — ${input.name} ($${quote.price}/visit)`,
    `<p>${input.name} just signed up through the website's instant quote tool.</p>
     <p><strong>${SERVICE_LABELS[input.service]}</strong> at ${input.addressLine} — $${quote.price}/visit (${Math.round(
      input.sqft
    ).toLocaleString()} sq ft).</p>
     <p>Contact: ${input.email ?? ""} ${input.phone ?? ""}</p>
     <p>They're already in the CRM as an active customer with a scheduled job.</p>`
  );

  return { ok: true as const, price: quote.price };
}

// Customer saw the price and said no thanks — still captured as a lead so
// it's not a dead end, and the owner gets a heads-up in case a follow-up
// call would save the job.
export async function declineInstantQuote(formData: FormData) {
  const input = readContactAndAddress(formData);
  const quote = needsManualQuote(input.sqft) ? null : estimateInstantQuote(input.service, input.sqft);

  const customer = await prisma.customer.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      status: "lead",
      pipelineStage: "lost",
      source: `instant_quote_${input.service}`,
      notes: quote
        ? `Declined an instant ${SERVICE_LABELS[input.service]} quote of $${quote.price}/visit.`
        : `Requested an instant ${SERVICE_LABELS[input.service]} quote and declined to proceed.`,
    },
  });
  await prisma.property.create({
    data: {
      customerId: customer.id,
      addressLine: input.addressLine,
      city: input.city,
      state: input.state,
      zip: input.zip,
      lat: input.lat,
      lng: input.lng,
      measurements: input.measurements,
      ...(input.service === "mowing" ? { lawnSqft: input.sqft } : { driveSqft: input.sqft }),
    },
  });
  await prisma.activity.create({
    data: {
      customerId: customer.id,
      type: "note",
      body: quote
        ? `Declined instant ${SERVICE_LABELS[input.service]} quote of $${quote.price}/visit through the website.`
        : `Requested an instant ${SERVICE_LABELS[input.service]} quote through the website and declined.`,
    },
  });

  await notifyOwner(
    `Quote declined — ${input.name}`,
    `<p>${input.name} got an instant ${SERVICE_LABELS[input.service]} quote${
      quote ? ` of $${quote.price}/visit` : ""
    } at ${input.addressLine} and declined it.</p>
     <p>Contact: ${input.email ?? ""} ${input.phone ?? ""} — might be worth a follow-up call.</p>`
  );

  return { ok: true as const };
}
