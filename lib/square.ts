import crypto from "crypto";

const SQUARE_VERSION = "2025-01-23";

export function isSquareConfigured() {
  return Boolean(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);
}

function getBaseUrl() {
  return process.env.SQUARE_ENVIRONMENT === "sandbox"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";
}

async function squareFetch(path: string, init: RequestInit) {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) throw new Error("Square isn't configured on this deployment (SQUARE_ACCESS_TOKEN missing).");

  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Square-Version": SQUARE_VERSION,
      ...init.headers,
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body?.errors?.[0]?.detail || `Square API error (${res.status})`;
    throw new Error(message);
  }
  return body;
}

type CustomerForSquare = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  squareCustomerId: string | null;
};

// Finds (by our customer id, stored as Square's reference_id) or creates the
// matching Square Customer profile, so invoices are attributed correctly in
// Square's own dashboard.
export async function ensureSquareCustomerId(customer: CustomerForSquare): Promise<string> {
  if (customer.squareCustomerId) return customer.squareCustomerId;

  const searchBody = await squareFetch("/v2/customers/search", {
    method: "POST",
    body: JSON.stringify({
      query: { filter: { reference_id: { exact: customer.id } } },
    }),
  });
  const existing = searchBody?.customers?.[0]?.id;
  if (existing) return existing;

  const [firstName, ...rest] = customer.name.trim().split(" ");
  const createBody = await squareFetch("/v2/customers", {
    method: "POST",
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      given_name: firstName || customer.name,
      family_name: rest.join(" ") || undefined,
      email_address: customer.email || undefined,
      phone_number: customer.phone || undefined,
      reference_id: customer.id,
    }),
  });
  return createBody.customer.id;
}

type InvoiceForSquare = {
  id: string;
  number: number;
  dueAt: Date | null;
  lineItems: { description: string; quantity: number; unitPrice: number }[];
};

// Creates a Square Order + Invoice for one of our invoices and publishes it,
// so the customer gets a real Square-hosted payment page (card, ACH, Cash
// App — whatever the seller's Square account accepts). We never let Square
// send its own email; delivery stays SHARE_MANUALLY so our own branded email
// (via Resend) is the only thing the customer sees, with the Square payment
// link embedded in it.
export async function createSquareInvoice(
  invoice: InvoiceForSquare,
  squareCustomerId: string
): Promise<{ squareInvoiceId: string; squareOrderId: string; publicUrl: string }> {
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!locationId) throw new Error("SQUARE_LOCATION_ID is not set.");

  const orderBody = await squareFetch("/v2/orders", {
    method: "POST",
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      order: {
        location_id: locationId,
        customer_id: squareCustomerId,
        reference_id: invoice.id,
        line_items: invoice.lineItems.map((li) => ({
          name: li.description.slice(0, 500),
          quantity: String(li.quantity),
          base_price_money: {
            amount: Math.round(li.unitPrice * 100),
            currency: "USD",
          },
        })),
      },
    }),
  });
  const orderId = orderBody.order.id;

  const dueDate = (invoice.dueAt ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))
    .toISOString()
    .slice(0, 10);

  const invoiceBody = await squareFetch("/v2/invoices", {
    method: "POST",
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      invoice: {
        location_id: locationId,
        order_id: orderId,
        invoice_number: String(invoice.number),
        primary_recipient: { customer_id: squareCustomerId },
        payment_requests: [{ request_type: "BALANCE", due_date: dueDate }],
        delivery_method: "SHARE_MANUALLY",
        accepted_payment_methods: { card: true, bank_account: true, cash_app_pay: true },
      },
    }),
  });
  const createdInvoice = invoiceBody.invoice;

  const publishBody = await squareFetch(`/v2/invoices/${createdInvoice.id}/publish`, {
    method: "POST",
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      version: createdInvoice.version,
    }),
  });

  return {
    squareInvoiceId: publishBody.invoice.id,
    squareOrderId: orderId,
    publicUrl: publishBody.invoice.public_url,
  };
}

// Square signs webhook deliveries as base64(HMAC-SHA256(notificationUrl + rawBody)).
// notificationUrl must be the exact URL configured for the subscription in the
// Square Developer Dashboard.
export function verifySquareWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  notificationUrl: string
): boolean {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!key || !signatureHeader) return false;

  const expected = crypto
    .createHmac("sha256", key)
    .update(notificationUrl + rawBody)
    .digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
