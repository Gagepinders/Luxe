-- CreateTable
CREATE TABLE "CallLog" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'outbound',
    "outcome" TEXT NOT NULL DEFAULT 'connected',
    "notes" TEXT,
    "followUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CallLog_customerId_idx" ON "CallLog"("customerId");

-- CreateIndex
CREATE INDEX "CallLog_followUpAt_idx" ON "CallLog"("followUpAt");

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
