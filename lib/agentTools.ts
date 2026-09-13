import { z } from "zod";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getResendClient, getFromAddress, getReplyToAddress } from "@/lib/resend";
import { getCompanyProfile } from "@/lib/companyProfile";
import { generateToken } from "@/lib/tokens";
import { getAppUrl } from "@/lib/appUrl";
import { formatCurrency } from "@/lib/format";

export type ToolCallSummary = { name: string; summary: string; href?: string };

// Tools are built per-request (not module-level singletons) so each one can
// push a plain-language summary into the caller's log — the chat UI renders
// that log as action chips ("Created Quote #1042") instead of trying to
// parse the model's own prose for what actually happened.
export function buildAgentTools(log: ToolCallSummary[]) {
  const searchCustomers = betaZodTool({
    name: "search_customers",
    description:
      "Search customers by name, company, phone, or email. Use this to find the customerId needed by other tools — never guess or invent one.",
    inputSchema: z.object({ query: z.string().describe("Name, company, phone, or email to search for") }),
    run: async (input) => {
      const customers = await prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: input.query, mode: "insensitive" } },
            { companyName: { contains: input.query, mode: "insensitive" } },
            { email: { contains: input.query, mode: "insensitive" } },
            { phone: { contains: input.query } },
          ],
        },
        select: { id: true, name: true, companyName: true, email: true, phone: true, pipelineStage: true, status: true },
        take: 8,
      });
      return JSON.stringify(customers);
    },
  });

  const getCustomer = betaZodTool({
    name: "get_customer",
    description:
      "Get full detail on one customer: their properties (with measured areas), and their recent quotes.",
    inputSchema: z.object({ customerId: z.string() }),
    run: async (input) => {
      const customer = await prisma.customer.findUnique({
        where: { id: input.customerId },
        include: {
          properties: {
            select: {
              id: true,
              label: true,
              addressLine: true,
              lawnSqft: true,
              driveSqft: true,
              walkwaySqft: true,
              mulchSqft: true,
            },
          },
          quotes: {
            select: { id: true, number: true, status: true, title: true },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      });
      if (!customer) return JSON.stringify({ error: "No customer found with that id." });
      return JSON.stringify(customer);
    },
  });

  const searchProperties = betaZodTool({
    name: "search_properties",
    description:
      "Search properties by address, label, or the owning customer's name. Returns each property's measured areas (lawn/drive/walkway/mulch, in sqft) and its customerId/propertyId.",
    inputSchema: z.object({ query: z.string().describe("Address, property label, or customer name") }),
    run: async (input) => {
      const properties = await prisma.property.findMany({
        where: {
          OR: [
            { addressLine: { contains: input.query, mode: "insensitive" } },
            { label: { contains: input.query, mode: "insensitive" } },
            { customer: { name: { contains: input.query, mode: "insensitive" } } },
          ],
        },
        select: {
          id: true,
          customerId: true,
          label: true,
          addressLine: true,
          lawnSqft: true,
          driveSqft: true,
          walkwaySqft: true,
          mulchSqft: true,
          customer: { select: { name: true } },
        },
        take: 8,
      });
      return JSON.stringify(properties);
    },
  });

  const getServiceRates = betaZodTool({
    name: "get_service_rates",
    description:
      "Get the business's actual configured service types and rates (landscaping + snow removal), e.g. mulch installation $/sqft. Always use these real rates instead of guessing a price.",
    inputSchema: z.object({}),
    run: async () => {
      const rates = await prisma.serviceType.findMany({
        where: { active: true },
        select: { name: true, category: true, defaultUnit: true, defaultRate: true },
      });
      return JSON.stringify(rates);
    },
  });

  const getMaterialStock = betaZodTool({
    name: "get_material_stock",
    description: "Get current inventory levels for tracked materials (mulch, salt, ice melt, etc.), including low-stock thresholds.",
    inputSchema: z.object({}),
    run: async () => {
      const materials = await prisma.materialStock.findMany({
        select: { name: true, unit: true, quantity: true, lowStockAt: true },
      });
      return JSON.stringify(materials);
    },
  });

  const getTodayOverview = betaZodTool({
    name: "get_today_overview",
    description:
      "Get a snapshot of the business right now: jobs scheduled today, overdue invoices, pending call follow-ups, and any low-stock materials. Use for general 'how's today looking' style questions.",
    inputSchema: z.object({}),
    run: async () => {
      const now = new Date();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const [jobsToday, overdueInvoices, pendingFollowUps, materials] = await Promise.all([
        prisma.job.findMany({
          where: { scheduledDate: { gte: start, lt: end }, status: { not: "cancelled" } },
          select: { title: true, status: true, customer: { select: { name: true } } },
        }),
        prisma.invoice.count({ where: { status: "overdue" } }),
        prisma.callLog.count({ where: { followUpAt: { lt: now } } }),
        prisma.materialStock.findMany({ select: { name: true, quantity: true, lowStockAt: true, unit: true } }),
      ]);
      const lowStock = materials.filter((m) => m.quantity <= m.lowStockAt);

      return JSON.stringify({ jobsToday, overdueInvoiceCount: overdueInvoices, pendingFollowUpCount: pendingFollowUps, lowStock });
    },
  });

  const createQuote = betaZodTool({
    name: "create_quote",
    description:
      "Create a draft quote for a customer. This only creates a draft — it does NOT email anything to the customer. Look up the customer/property first with search_customers or search_properties to get real ids. Line item prices should come from get_service_rates, not guesses.",
    inputSchema: z.object({
      customerId: z.string(),
      propertyId: z.string().optional().describe("Optional — omit if this quote isn't tied to one property"),
      title: z.string().optional(),
      notes: z.string().optional(),
      lineItems: z
        .array(
          z.object({
            description: z.string(),
            quantity: z.number().default(1),
            unit: z.string().default("visit"),
            unitPrice: z.number(),
          })
        )
        .min(1),
    }),
    run: async (input) => {
      const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
      if (!customer) return "Error: no customer with that id exists. Search for the customer first.";

      const quoteCount = await prisma.quote.count();
      const quote = await prisma.quote.create({
        data: {
          number: quoteCount + 1001,
          customerId: input.customerId,
          propertyId: input.propertyId ?? null,
          title: input.title ?? "",
          notes: input.notes ?? null,
          lineItems: {
            create: input.lineItems.map((li, i) => ({
              description: li.description,
              quantity: li.quantity,
              unit: li.unit,
              unitPrice: li.unitPrice,
              sortOrder: i,
            })),
          },
        },
      });
      const total = input.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);

      await prisma.activity.create({
        data: { customerId: input.customerId, type: "quote", body: `Quote #${quote.number} drafted by the AI assistant.` },
      });
      await prisma.customer.updateMany({
        where: { id: input.customerId, pipelineStage: "new" },
        data: { pipelineStage: "estimate_scheduled" },
      });

      revalidatePath("/quotes");
      revalidatePath("/pipeline");
      revalidatePath(`/customers/${input.customerId}`);

      log.push({
        name: "create_quote",
        summary: `Drafted Quote #${quote.number} for ${customer.name} — ${formatCurrency(total)}`,
        href: `/quotes/${quote.id}`,
      });

      return `Created draft Quote #${quote.number} for ${customer.name}, total ${formatCurrency(total)}. It is a DRAFT — nothing was sent to the customer. View it at /quotes/${quote.id}.`;
    },
  });

  const sendQuoteToCustomer = betaZodTool({
    name: "send_quote_to_customer",
    description:
      "Email an existing quote to its customer for online approval. Only call this when the user has clearly asked to send/email a quote — never send one just because it was created.",
    inputSchema: z.object({ quoteId: z.string() }),
    run: async (input) => {
      const quote = await prisma.quote.findUnique({
        where: { id: input.quoteId },
        include: { customer: true, lineItems: true },
      });
      if (!quote) return "Error: no quote with that id exists.";
      if (!quote.customer.email) {
        return `Cannot send — ${quote.customer.name} has no email on file. Add one on their customer page first.`;
      }

      const resend = getResendClient();
      if (!resend) {
        return "Email isn't configured on this deployment (RESEND_API_KEY missing) — cannot send. The quote is still saved as a draft.";
      }

      const token = quote.publicToken ?? generateToken();
      const total = quote.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
      const company = await getCompanyProfile();
      const link = `${getAppUrl()}/q/${token}`;

      await resend.emails.send({
        from: getFromAddress(),
        to: quote.customer.email,
        replyTo: getReplyToAddress(),
        subject: `Your quote from ${company.name}${quote.title ? ` — ${quote.title}` : ""}`,
        html: `
          <p>Hi ${quote.customer.name.split(" ")[0]},</p>
          <p>Here's your quote${quote.title ? ` for "${quote.title}"` : ""} from ${company.name}, totaling <strong>${formatCurrency(total)}</strong>.</p>
          <p><a href="${link}" style="display:inline-block;background:#235233;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:600;">View & respond to quote</a></p>
          <p style="color:#666;font-size:13px;">Or copy this link: ${link}</p>
          <p>Thanks,<br>${company.name}<br>${company.phone}</p>
        `,
      });

      await prisma.quote.update({
        where: { id: input.quoteId },
        data: { publicToken: token, status: "sent", sentAt: quote.sentAt ?? new Date() },
      });
      await prisma.customer.update({ where: { id: quote.customerId }, data: { pipelineStage: "estimate_sent" } });
      await prisma.activity.create({
        data: { customerId: quote.customerId, type: "email", body: `Quote #${quote.number} emailed to customer by the AI assistant.` },
      });

      revalidatePath(`/quotes/${input.quoteId}`);
      revalidatePath("/quotes");
      revalidatePath("/pipeline");

      log.push({
        name: "send_quote_to_customer",
        summary: `Emailed Quote #${quote.number} to ${quote.customer.name}`,
        href: `/quotes/${quote.id}`,
      });

      return `Sent Quote #${quote.number} to ${quote.customer.name} at ${quote.customer.email}.`;
    },
  });

  const createTodo = betaZodTool({
    name: "create_todo",
    description: "Add a to-do item to the shared task list (e.g. 'order more mulch', 'follow up with John').",
    inputSchema: z.object({
      title: z.string(),
      dueDate: z.string().optional().describe("ISO date, e.g. 2026-09-20 — omit if there's no specific date"),
      customerId: z.string().optional(),
    }),
    run: async (input) => {
      await prisma.todo.create({
        data: {
          title: input.title,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          customerId: input.customerId ?? null,
        },
      });
      revalidatePath("/todos");
      log.push({ name: "create_todo", summary: `Added to-do: ${input.title}`, href: "/todos" });
      return `Added "${input.title}" to the to-do list.`;
    },
  });

  return [
    searchCustomers,
    getCustomer,
    searchProperties,
    getServiceRates,
    getMaterialStock,
    getTodayOverview,
    createQuote,
    sendQuoteToCustomer,
    createTodo,
  ];
}
