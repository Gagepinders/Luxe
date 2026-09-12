import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySquareWebhookSignature } from "@/lib/square";
import { getAppUrl } from "@/lib/appUrl";

export const dynamic = "force-dynamic";

// Square calls this when an invoice we created changes status (paid,
// canceled, etc). Must stay reachable without a session — Square, not a
// signed-in user, calls it — so it's exempted in middleware.ts and instead
// authenticates the request itself via Square's HMAC signature.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-square-hmacsha256-signature");
  const notificationUrl = `${getAppUrl()}/api/webhooks/square`;

  if (!verifySquareWebhookSignature(rawBody, signature, notificationUrl)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.type === "invoice.updated" || event.type === "invoice.payment_made") {
    const squareInvoice = event.data?.object?.invoice;
    const squareInvoiceId: string | undefined = squareInvoice?.id ?? event.data?.id;
    const status: string | undefined = squareInvoice?.status;

    if (squareInvoiceId && status === "PAID") {
      const invoice = await prisma.invoice.findUnique({ where: { squareInvoiceId } });
      if (invoice && invoice.status !== "paid") {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: "paid", paidAt: new Date() },
        });
        await prisma.activity.create({
          data: {
            customerId: invoice.customerId,
            type: "status_change",
            body: `Invoice #${invoice.number} paid online via Square.`,
          },
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
