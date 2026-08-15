-- AlterTable
-- Records the Participant who created a Transfer, for author attribution in the
-- two-way stream. Nullable so existing rows and file uploads (no socket
-- Participant) migrate cleanly.
ALTER TABLE "Transfer" ADD COLUMN "authorParticipantId" TEXT;

-- AddForeignKey
-- SET NULL, not RESTRICT: orphaning an author drops the attribution, never the
-- Transfer.
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_authorParticipantId_fkey" FOREIGN KEY ("authorParticipantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
