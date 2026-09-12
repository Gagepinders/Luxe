import type { PrismaClient } from "@/app/generated/prisma/client";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

export async function seedDatabase(prisma: PrismaClient) {
  await prisma.activity.deleteMany();
  await prisma.job.deleteMany();
  await prisma.quoteLineItem.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.property.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.serviceType.deleteMany();

  await prisma.companyProfile.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  const serviceTypes = await Promise.all(
    [
      { name: "Lawn Mowing", category: "landscaping", defaultUnit: "visit", defaultRate: 65 },
      { name: "Landscape Maintenance", category: "landscaping", defaultUnit: "visit", defaultRate: 85 },
      { name: "Garden Bed Design", category: "landscaping", defaultUnit: "hour", defaultRate: 75 },
      { name: "Mulch Installation", category: "landscaping", defaultUnit: "sq ft", defaultRate: 0.85 },
      { name: "Spring Cleanup", category: "landscaping", defaultUnit: "visit", defaultRate: 250 },
      { name: "Fall Cleanup", category: "landscaping", defaultUnit: "visit", defaultRate: 275 },
      { name: "Shrub & Hedge Trimming", category: "landscaping", defaultUnit: "visit", defaultRate: 120 },
      { name: "Weed Control", category: "landscaping", defaultUnit: "visit", defaultRate: 60 },
      { name: "Snow Plowing", category: "snow_removal", defaultUnit: "visit", defaultRate: 95 },
      { name: "Ice Management", category: "snow_removal", defaultUnit: "visit", defaultRate: 55 },
    ].map((s) => prisma.serviceType.create({ data: s }))
  );

  const svc = (name: string) => serviceTypes.find((s) => s.name === name)!;

  // --- Customers & properties -------------------------------------------------
  const carol = await prisma.customer.create({
    data: {
      name: "Carol Bennett",
      email: "carol.bennett@example.com",
      phone: "(802) 555-0142",
      type: "residential",
      status: "active",
      tags: "VIP, mowing-weekly",
      notes: "Prefers Friday morning visits. Has a small dog in the backyard.",
    },
  });
  const carolProp = await prisma.property.create({
    data: {
      customerId: carol.id,
      label: "Home",
      addressLine: "148 South Willard St",
      city: "Burlington",
      state: "VT",
      zip: "05401",
      lat: 44.4675,
      lng: -73.2065,
      lawnSqft: 6200,
      driveSqft: 900,
      totalAcres: 6200 / 43560,
      hazards: "Small dog in fenced backyard",
    },
  });

  const dave = await prisma.customer.create({
    data: {
      name: "Dave & Lisa Morrison",
      email: "morrison.family@example.com",
      phone: "(802) 555-0198",
      type: "residential",
      status: "active",
      tags: "snow-plan",
    },
  });
  const daveProp = await prisma.property.create({
    data: {
      customerId: dave.id,
      label: "Home",
      addressLine: "22 Pinecrest Dr",
      city: "Essex Junction",
      state: "VT",
      zip: "05452",
      lat: 44.4912,
      lng: -73.1125,
      lawnSqft: 8400,
      driveSqft: 1400,
      totalAcres: 8400 / 43560,
      gateCode: "N/A",
      accessNotes: "Long driveway — plow both sides, mailbox at the road.",
    },
  });

  const greenfield = await prisma.customer.create({
    data: {
      name: "Tom Reyes",
      companyName: "Greenfield Plaza LLC",
      email: "tom@greenfieldplazavt.com",
      phone: "(802) 555-0164",
      type: "commercial",
      status: "active",
      tags: "commercial, snow-plan",
      notes: "Property manager for a small retail plaza. Needs lot plowed before 7am.",
    },
  });
  const greenfieldProp = await prisma.property.create({
    data: {
      customerId: greenfield.id,
      label: "Greenfield Plaza",
      addressLine: "540 Williston Rd",
      city: "South Burlington",
      state: "VT",
      zip: "05403",
      lat: 44.4581,
      lng: -73.1839,
      lawnSqft: 3000,
      driveSqft: 18000,
      totalAcres: 21000 / 43560,
      accessNotes: "Plow before 7am for store opening. Do not block dumpster access.",
    },
  });

  const sarah = await prisma.customer.create({
    data: {
      name: "Sarah Kim",
      email: "sarah.kim@example.com",
      phone: "(802) 555-0121",
      type: "residential",
      status: "lead",
      tags: "spring-cleanup",
      notes: "Requested a quote via the website contact form.",
    },
  });
  const sarahProp = await prisma.property.create({
    data: {
      customerId: sarah.id,
      label: "Home",
      addressLine: "9 Maple Tree Ln",
      city: "Williston",
      state: "VT",
      zip: "05495",
      lat: 44.4368,
      lng: -73.0912,
      lawnSqft: 5200,
      totalAcres: 5200 / 43560,
    },
  });

  const patel = await prisma.customer.create({
    data: {
      name: "Raj Patel",
      email: "raj.patel@example.com",
      phone: "(802) 555-0177",
      type: "residential",
      status: "active",
      tags: "mowing-weekly, hedge-trim",
    },
  });
  const patelProp = await prisma.property.create({
    data: {
      customerId: patel.id,
      label: "Home",
      addressLine: "77 Overlake Park Rd",
      city: "Colchester",
      state: "VT",
      zip: "05446",
      lat: 44.5401,
      lng: -73.1688,
      lawnSqft: 7100,
      driveSqft: 1100,
      totalAcres: 7100 / 43560,
    },
  });

  const northside = await prisma.customer.create({
    data: {
      name: "Megan Foss",
      companyName: "Northside Realty Group",
      email: "megan@northsiderealtyvt.com",
      phone: "(802) 555-0155",
      type: "commercial",
      status: "inactive",
      tags: "commercial",
      notes: "Paused service over winter, revisit in spring.",
    },
  });
  const northsideProp = await prisma.property.create({
    data: {
      customerId: northside.id,
      label: "Office building",
      addressLine: "215 College St",
      city: "Burlington",
      state: "VT",
      zip: "05401",
      lat: 44.4759,
      lng: -73.2121,
      lawnSqft: 1800,
      driveSqft: 4200,
      totalAcres: 6000 / 43560,
    },
  });

  const wilsons = await prisma.customer.create({
    data: {
      name: "Emily Wilson",
      email: "emily.wilson@example.com",
      phone: "(802) 555-0133",
      type: "residential",
      status: "lead",
      tags: "fall-cleanup",
      notes: "Comparing quotes from a couple of companies.",
    },
  });
  await prisma.property.create({
    data: {
      customerId: wilsons.id,
      label: "Home",
      addressLine: "310 Hinesburg Rd",
      city: "South Burlington",
      state: "VT",
      zip: "05403",
      lat: 44.4491,
      lng: -73.1901,
      lawnSqft: 4300,
      totalAcres: 4300 / 43560,
    },
  });

  // --- Quotes -------------------------------------------------------------
  async function quote(opts: {
    customer: { id: string };
    property: { id: string };
    number: number;
    title: string;
    status: "draft" | "sent" | "won" | "lost";
    createdDaysAgo: number;
    sentDaysAgo?: number;
    decidedDaysAgo?: number;
    lostReason?: string;
    validInDays?: number;
    items: { service: string; qty: number; unit: string; price: number }[];
  }) {
    return prisma.quote.create({
      data: {
        number: opts.number,
        customerId: opts.customer.id,
        propertyId: opts.property.id,
        title: opts.title,
        status: opts.status,
        createdAt: daysAgo(opts.createdDaysAgo),
        sentAt: opts.sentDaysAgo !== undefined ? daysAgo(opts.sentDaysAgo) : null,
        decidedAt: opts.decidedDaysAgo !== undefined ? daysAgo(opts.decidedDaysAgo) : null,
        lostReason: opts.lostReason,
        validUntil: opts.validInDays !== undefined ? daysFromNow(opts.validInDays) : null,
        lineItems: {
          create: opts.items.map((it, i) => ({
            description: it.service,
            serviceTypeId: svc(it.service).id,
            quantity: it.qty,
            unit: it.unit,
            unitPrice: it.price,
            sortOrder: i,
          })),
        },
      },
    });
  }

  const q1 = await quote({
    customer: carol,
    property: carolProp,
    number: 1001,
    title: "Weekly mowing season plan",
    status: "won",
    createdDaysAgo: 60,
    sentDaysAgo: 59,
    decidedDaysAgo: 55,
    items: [{ service: "Lawn Mowing", qty: 20, unit: "visit", price: 65 }],
  });

  await quote({
    customer: dave,
    property: daveProp,
    number: 1002,
    title: "Winter snow plan",
    status: "won",
    createdDaysAgo: 40,
    sentDaysAgo: 39,
    decidedDaysAgo: 35,
    items: [
      { service: "Snow Plowing", qty: 10, unit: "visit", price: 95 },
      { service: "Ice Management", qty: 6, unit: "visit", price: 55 },
    ],
  });

  const q3 = await quote({
    customer: greenfield,
    property: greenfieldProp,
    number: 1003,
    title: "Commercial lot plowing contract",
    status: "won",
    createdDaysAgo: 30,
    sentDaysAgo: 29,
    decidedDaysAgo: 20,
    items: [{ service: "Snow Plowing", qty: 12, unit: "visit", price: 220 }],
  });

  await quote({
    customer: sarah,
    property: sarahProp,
    number: 1004,
    title: "Spring cleanup estimate",
    status: "sent",
    createdDaysAgo: 6,
    sentDaysAgo: 5,
    validInDays: 9,
    items: [
      { service: "Spring Cleanup", qty: 1, unit: "visit", price: 250 },
      { service: "Mulch Installation", qty: 400, unit: "sq ft", price: 0.85 },
    ],
  });

  await quote({
    customer: patel,
    property: patelProp,
    number: 1005,
    title: "Weekly mowing + hedge trimming",
    status: "won",
    createdDaysAgo: 25,
    sentDaysAgo: 24,
    decidedDaysAgo: 22,
    items: [
      { service: "Lawn Mowing", qty: 16, unit: "visit", price: 65 },
      { service: "Shrub & Hedge Trimming", qty: 2, unit: "visit", price: 120 },
    ],
  });

  await quote({
    customer: wilsons,
    property: await prisma.property.findFirstOrThrow({ where: { customerId: wilsons.id } }),
    number: 1006,
    title: "Fall cleanup estimate",
    status: "sent",
    createdDaysAgo: 3,
    sentDaysAgo: 2,
    validInDays: 12,
    items: [{ service: "Fall Cleanup", qty: 1, unit: "visit", price: 275 }],
  });

  await quote({
    customer: northside,
    property: northsideProp,
    number: 1007,
    title: "Landscape maintenance contract",
    status: "lost",
    createdDaysAgo: 70,
    sentDaysAgo: 68,
    decidedDaysAgo: 60,
    lostReason: "Went with a lower bid from another contractor",
    items: [{ service: "Landscape Maintenance", qty: 10, unit: "visit", price: 85 }],
  });

  await quote({
    customer: sarah,
    property: sarahProp,
    number: 1008,
    title: "Weekly mowing add-on",
    status: "draft",
    createdDaysAgo: 1,
    items: [{ service: "Lawn Mowing", qty: 18, unit: "visit", price: 65 }],
  });

  await quote({
    customer: carol,
    property: carolProp,
    number: 1009,
    title: "Fall cleanup add-on",
    status: "lost",
    createdDaysAgo: 20,
    sentDaysAgo: 19,
    decidedDaysAgo: 15,
    lostReason: "Customer decided to handle it themselves this year",
    items: [{ service: "Fall Cleanup", qty: 1, unit: "visit", price: 275 }],
  });

  // --- Jobs ----------------------------------------------------------------
  async function job(opts: {
    customer: { id: string };
    property: { id: string };
    quoteId?: string;
    service: string;
    title: string;
    status: "scheduled" | "in_progress" | "completed" | "cancelled";
    dayOffset: number;
    crew?: string;
    price: number;
    recurrence?: string;
    startTime?: string;
  }) {
    return prisma.job.create({
      data: {
        customerId: opts.customer.id,
        propertyId: opts.property.id,
        quoteId: opts.quoteId,
        serviceTypeId: svc(opts.service).id,
        title: opts.title,
        status: opts.status,
        scheduledDate: opts.dayOffset >= 0 ? daysFromNow(opts.dayOffset) : daysAgo(-opts.dayOffset),
        startTime: opts.startTime ?? "08:00",
        crew: opts.crew ?? "Crew A",
        price: opts.price,
        recurrence: opts.recurrence ?? "none",
        completedAt: opts.status === "completed" ? (opts.dayOffset >= 0 ? daysFromNow(opts.dayOffset) : daysAgo(-opts.dayOffset)) : null,
      },
    });
  }

  // Past completed mowing visits for Carol (weekly)
  for (let i = 6; i >= 1; i--) {
    await job({
      customer: carol,
      property: carolProp,
      quoteId: q1.id,
      service: "Lawn Mowing",
      title: "Weekly mowing",
      status: "completed",
      dayOffset: -i * 7,
      price: 65,
      recurrence: "weekly",
      crew: "Crew A",
    });
  }
  await job({
    customer: carol,
    property: carolProp,
    quoteId: q1.id,
    service: "Lawn Mowing",
    title: "Weekly mowing",
    status: "scheduled",
    dayOffset: 2,
    price: 65,
    recurrence: "weekly",
    crew: "Crew A",
  });

  // Patel weekly mowing + upcoming hedge trim
  for (let i = 3; i >= 1; i--) {
    await job({
      customer: patel,
      property: patelProp,
      service: "Lawn Mowing",
      title: "Weekly mowing",
      status: "completed",
      dayOffset: -i * 7,
      price: 65,
      recurrence: "weekly",
      crew: "Crew B",
    });
  }
  await job({
    customer: patel,
    property: patelProp,
    service: "Lawn Mowing",
    title: "Weekly mowing",
    status: "scheduled",
    dayOffset: 1,
    price: 65,
    recurrence: "weekly",
    crew: "Crew B",
  });
  await job({
    customer: patel,
    property: patelProp,
    service: "Shrub & Hedge Trimming",
    title: "Hedge trimming",
    status: "scheduled",
    dayOffset: 5,
    price: 120,
    crew: "Crew B",
    startTime: "13:00",
  });

  // Greenfield Plaza snow plowing — on demand, one today, one completed recently
  await job({
    customer: greenfield,
    property: greenfieldProp,
    quoteId: q3.id,
    service: "Snow Plowing",
    title: "Lot plowing",
    status: "completed",
    dayOffset: -3,
    price: 220,
    recurrence: "on_demand",
    crew: "Crew A",
    startTime: "05:00",
  });
  await job({
    customer: greenfield,
    property: greenfieldProp,
    quoteId: q3.id,
    service: "Snow Plowing",
    title: "Lot plowing",
    status: "scheduled",
    dayOffset: 0,
    price: 220,
    recurrence: "on_demand",
    crew: "Crew A",
    startTime: "05:00",
  });

  // Dave & Lisa snow plan
  await job({
    customer: dave,
    property: daveProp,
    service: "Snow Plowing",
    title: "Driveway plow",
    status: "completed",
    dayOffset: -2,
    price: 95,
    recurrence: "on_demand",
    crew: "Crew B",
    startTime: "06:00",
  });
  await job({
    customer: dave,
    property: daveProp,
    service: "Ice Management",
    title: "Ice treatment",
    status: "scheduled",
    dayOffset: 0,
    price: 55,
    recurrence: "on_demand",
    crew: "Crew B",
    startTime: "06:30",
  });

  // A cancelled job for realism
  await job({
    customer: sarah,
    property: sarahProp,
    service: "Spring Cleanup",
    title: "Spring cleanup",
    status: "cancelled",
    dayOffset: -10,
    price: 250,
    crew: "Crew A",
  });

  // Upcoming jobs later this week
  await job({
    customer: carol,
    property: carolProp,
    service: "Weed Control",
    title: "Weed control treatment",
    status: "scheduled",
    dayOffset: 4,
    price: 60,
    crew: "Crew A",
  });

  // --- Activities -----------------------------------------------------------
  await prisma.activity.createMany({
    data: [
      { customerId: carol.id, type: "call", body: "Called to confirm Friday mowing schedule for the season." },
      { customerId: carol.id, type: "note", body: "Asked about adding weed control to the weekly plan." },
      { customerId: dave.id, type: "note", body: "Left a voicemail about extending the driveway plow radius." },
      { customerId: greenfield.id, type: "email", body: "Sent updated plowing contract for plaza lot." },
      { customerId: sarah.id, type: "note", body: "Requested quote through the website contact form." },
      { customerId: northside.id, type: "note", body: "Asked to revisit contract when they reopen for the season." },
    ],
  });
}
