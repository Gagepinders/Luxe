-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "squareCustomerId" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "squareInvoiceId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "squareOrderId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "squarePublicUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_squareInvoiceId_key" ON "Invoice"("squareInvoiceId");
