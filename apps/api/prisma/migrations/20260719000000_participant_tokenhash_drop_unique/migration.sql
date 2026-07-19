-- DropIndex
-- tokenHash is no longer a participant identity: each socket connection is its
-- own Participant row, so the same token legitimately repeats across reconnects.
DROP INDEX "Participant_tokenHash_key";
