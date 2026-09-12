-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "publicToken" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "publicToken" TEXT;

-- AlterTable
ALTER TABLE "CompanyProfile" ADD COLUMN "googleReviewUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Quote_publicToken_key" ON "Quote"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_publicToken_key" ON "Invoice"("publicToken");
