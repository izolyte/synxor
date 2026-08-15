-- AlterTable
-- An edited display name for a Participant's identity. Nullable: the auto
-- "Colour Noun" is derived from tokenHash and stored nowhere, so existing rows
-- and every un-renamed Participant migrate cleanly with no default.
ALTER TABLE "Participant" ADD COLUMN "displayName" TEXT;
