-- CreateTable
CREATE TABLE "TextPayload" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TextPayload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TextPayload_transferId_key" ON "TextPayload"("transferId");

-- AddForeignKey
ALTER TABLE "TextPayload" ADD CONSTRAINT "TextPayload_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
