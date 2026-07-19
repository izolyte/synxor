-- prisma DisableTransaction
-- CONCURRENTLY avoids the ACCESS EXCLUSIVE lock a plain DROP INDEX takes on the
-- whole Participant table; it can't run inside a transaction, hence the pragma
-- above. Safe here — Participant_tokenHash_key is a plain unique index, not a
-- constraint-backed one that would need ALTER TABLE ... DROP CONSTRAINT.

-- DropIndex
-- tokenHash is no longer a participant identity: each socket connection is its
-- own Participant row, so the same token legitimately repeats across reconnects.
DROP INDEX CONCURRENTLY "Participant_tokenHash_key";
