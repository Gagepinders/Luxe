"use server";

import { prisma } from "@/lib/prisma";
import { getResendClient, getFromAddress, getReplyToAddress } from "@/lib/resend";
import { getCompanyProfile } from "@/lib/companyProfile";
import { geocodeAddress } from "@/lib/geocode";
import { findMeasuredProperty } from "@/lib/propertyMatch";
import { sendQuoteToCustomer } from "@/app/actions/quotes";
import {
  estimateInstantQuote,
  needsManualQuote,
  SERVICE_LABELS,
  type InstantQuoteEstimate,
  type InstantQuoteService,
} from "@/lib/pricing";

function readContact(formData: FormData) {
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

  return {
    service: service as InstantQuoteService,
    name,
    email: email || null,
    phone: phone || null,
    addressLine,
    city,
    state,
    zip,
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

type RequestResult =
  | { kind: "quoted"; propertyId: string; estimate: InstantQuoteEstimate }
  | { kind: "pending" };

// Step 1 of the public flow. Never asks the visitor to measure anything —
// looks for a property the owner has already measured at this address. If
// one exists (and isn't too large for instant pricing), quotes it on the
// spot. Otherwise captures the request as a lead so the owner can measure
// it themselves and send a real price with sendMeasuredInstantQuote below.
export async function requestInstantQuote(formData: FormData): Promise<RequestResult> {
  const input = readContact(formData);
  const match = await findMeasuredProperty(input.addressLine, input.service);

  if (match) {
    const sqft = input.service === "mowing" ? match.lawnSqft! : match.driveSqft!;
    if (!needsManualQuote(sqft)) {
      return { kind: "quoted", propertyId: match.id, estimate: estimateInstantQuote(input.service, sqft) };
    }
  }

  let customerId: string;
  if (match) {
    customerId = match.customerId;
  } else {
    const existing = input.email
      ? await prisma.customer.findFirst({ where: { email: input.email } })
      : null;
    if (existing) {
      customerId = existing.id;
    } else {
      const customer = await prisma.customer.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          status: "lead",
          pipelineStage: "new",
          source: `instant_quote_${input.service}`,
        },
      });
      customerId = customer.id;
    }
    const geo = (await geocodeAddress(`${input.addressLine}, ${input.city}, ${input.state}`))[0];
    await prisma.property.create({
      data: {
        customerId,
        addressLine: input.addressLine,
        city: input.city,
        state: input.state,
        zip: input.zip,
        lat: geo?.lat ?? null,
        lng: geo?.lng ?? null,
      },
    });
  }

  await prisma.activity.create({
    data: {
      customerId,
      type: "note",
      body: `Wants an instant ${SERVICE_LABELS[input.service]} quote at ${input.addressLine} — measure the property, then use "Send instant price" to send them a number.`,
    },
  });
  await notifyOwner(
    `New instant-quote request — ${input.name}`,
    `<p>${input.name} wants a ${SERVICE_LABELS[input.service]} quote at ${input.addressLine} through the website.</p>
     <p>Measure the property in the CRM, then send them their price from the property page.</p>
     <p>Contact: ${input.email ?? ""} ${input.phone ?? ""}</p>`
  );

  return { kind: "pending" };
}

// Visitor saw an instant price (from an already-measured property) and
// approved it — signs them up for real, on the spot.
export async function approveMatchedQuote(formData: FormData) {
  const input = readContact(formData);
  const propertyId = String(formData.get("propertyId") ?? "");
  const property = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
    include: { customer: true },
  });
  const sqft = input.service === "mowing" ? property.lawnSqft : property.driveSqft;
  if (!sqft || needsManualQuote(sqft)) {
    throw new Error("This property can't be instantly priced — contact us directly.");
  }
  const estimate = estimateInstantQuote(input.service, sqft);
  const serviceType = await findServiceType(input.service);
  const company = await getCompanyProfile();

  // Someone re-visiting the same address and clicking "sign me up" again
  // shouldn't spin up a second job — hand back the existing one instead.
  const existingJob = await prisma.job.findFirst({
    where: { propertyId: property.id, serviceTypeId: serviceType.id, status: { not: "cancelled" } },
  });
  if (existingJob) {
    return { ok: true as const, price: existingJob.price };
  }

  await prisma.customer.update({
    where: { id: property.customerId },
    data: {
      name: property.customer.name || input.name,
      email: property.customer.email ?? input.email,
      phone: property.customer.phone ?? input.phone,
      status: "active",
      pipelineStage: "won",
    },
  });

  const dbQuote = await prisma.quote.create({
    data: {
      customerId: property.customerId,
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
            unitPrice: estimate.price,
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
      customerId: property.customerId,
      propertyId: property.id,
      quoteId: dbQuote.id,
      serviceTypeId: serviceType.id,
      title: SERVICE_LABELS[input.service],
      status: "scheduled",
      scheduledDate: firstVisit,
      price: estimate.price,
      recurrence: input.service === "mowing" ? "weekly" : "on_demand",
      notes: "Signed up through the website's instant quote tool.",
    },
  });

  await prisma.activity.create({
    data: {
      customerId: property.customerId,
      type: "quote",
      body: `Signed up instantly through the website: ${SERVICE_LABELS[input.service]} at $${estimate.price}/visit.`,
    },
  });

  const email = property.customer.email ?? input.email;
  const resend = getResendClient();
  if (email && resend) {
    await resend.emails.send({
      from: getFromAddress(),
      to: email,
      replyTo: getReplyToAddress(),
      subject: `You're booked with ${company.name}!`,
      html: `
        <p>Hi ${(property.customer.name || input.name).split(" ")[0]},</p>
        <p>Thanks for signing up! Here's what you approved:</p>
        <p><strong>${SERVICE_LABELS[input.service]}</strong> at ${property.addressLine} — $${estimate.price} per visit.</p>
        <p>We'll be in touch to confirm your first visit. Questions? Just reply to this email or call ${company.phone}.</p>
        <p>Thanks,<br>${company.name}</p>
      `,
    });
  }

  await notifyOwner(
    `New instant sign-up — ${property.customer.name || input.name} ($${estimate.price}/visit)`,
    `<p>${property.customer.name || input.name} just signed up through the website's instant quote tool.</p>
     <p><strong>${SERVICE_LABELS[input.service]}</strong> at ${property.addressLine} — $${estimate.price}/visit.</p>
     <p>They're already in the CRM as an active customer with a scheduled job.</p>`
  );

  return { ok: true as const, price: estimate.price };
}

// Visitor saw an instant price and said no thanks.
export async function declineMatchedQuote(formData: FormData) {
  const input = readContact(formData);
  const propertyId = String(formData.get("propertyId") ?? "");
  const property = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
    include: { customer: true },
  });
  const sqft = input.service === "mowing" ? property.lawnSqft : property.driveSqft;
  const estimate = sqft && !needsManualQuote(sqft) ? estimateInstantQuote(input.service, sqft) : null;

  // Never let a decline downgrade someone who's already an active, paying
  // customer at this address (e.g. someone else in the household checking
  // pricing again, or a repeat visit) — only move status for genuine leads.
  const alreadyActive = property.customer.status === "active";
  await prisma.customer.update({
    where: { id: property.customerId },
    data: {
      name: property.customer.name || input.name,
      email: property.customer.email ?? input.email,
      phone: property.customer.phone ?? input.phone,
      ...(alreadyActive ? {} : { status: "lead", pipelineStage: "lost" }),
    },
  });
  await prisma.activity.create({
    data: {
      customerId: property.customerId,
      type: "note",
      body: estimate
        ? `Declined instant ${SERVICE_LABELS[input.service]} quote of $${estimate.price}/visit through the website.`
        : `Declined an instant quote request through the website.`,
    },
  });
  await notifyOwner(
    `Quote declined — ${property.customer.name || input.name}`,
    `<p>${property.customer.name || input.name} got an instant ${SERVICE_LABELS[input.service]} quote${
      estimate ? ` of $${estimate.price}/visit` : ""
    } at ${property.addressLine} and declined it.</p>
     ${alreadyActive ? "<p>This address is already an active customer — left their status as-is.</p>" : "<p>Might be worth a follow-up call.</p>"}`
  );

  return { ok: true as const };
}

// Owner-side: once a property that came in as a pending instant-quote lead
// (or any property, really) has been measured, this computes the same
// instant price and emails it via the existing quote-approval link — no
// need for the owner to build a quote by hand.
export async function sendMeasuredInstantQuote(propertyId: string, service: InstantQuoteService) {
  const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } });
  const sqft = service === "mowing" ? property.lawnSqft : property.driveSqft;
  if (!sqft || sqft <= 0) {
    throw new Error(`Measure the ${service === "mowing" ? "lawn" : "driveway"} first.`);
  }
  if (needsManualQuote(sqft)) {
    throw new Error("This property is too large for instant pricing — quote it manually instead.");
  }

  const estimate = estimateInstantQuote(service, sqft);
  const serviceType = await findServiceType(service);
  const quoteCount = await prisma.quote.count();
  const quote = await prisma.quote.create({
    data: {
      number: quoteCount + 1001,
      customerId: property.customerId,
      propertyId: property.id,
      title: `Instant ${SERVICE_LABELS[service]} quote`,
      lineItems: {
        create: [
          {
            serviceTypeId: serviceType.id,
            description: SERVICE_LABELS[service],
            quantity: 1,
            unit: "visit",
            unitPrice: estimate.price,
          },
        ],
      },
    },
  });

  await sendQuoteToCustomer(quote.id);
}
