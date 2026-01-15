-- CreateTable
CREATE TABLE "withdrawal_logs" (
    "id" TEXT NOT NULL,
    "withdrawalOrderId" TEXT NOT NULL,
    "pickerCedula" TEXT NOT NULL,
    "pickerName" TEXT NOT NULL,
    "childName" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "withdrawal_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "withdrawal_logs_withdrawalOrderId_key" ON "withdrawal_logs"("withdrawalOrderId");

-- CreateIndex
CREATE INDEX "withdrawal_logs_pickerCedula_idx" ON "withdrawal_logs"("pickerCedula");

-- CreateIndex
CREATE INDEX "withdrawal_logs_completedAt_idx" ON "withdrawal_logs"("completedAt");

-- AddForeignKey
ALTER TABLE "withdrawal_logs" ADD CONSTRAINT "withdrawal_logs_withdrawalOrderId_fkey" FOREIGN KEY ("withdrawalOrderId") REFERENCES "withdrawal_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
