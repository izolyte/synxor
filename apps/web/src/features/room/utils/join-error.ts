import { TRPCClientError } from "@trpc/client";
import type { JoinError } from "~/features/room/types/join-error";

// Only a code the server explicitly refused — not found or expired (NOT_FOUND), or
// malformed (BAD_REQUEST) — is a "rejected" code worth retyping. Everything else —
// a transport failure with no data, a 5xx, a rate limit — is retryable, so the
// classifier returns "network" and the form preserves the typed code.
const REJECTED_CODES = new Set(["NOT_FOUND", "BAD_REQUEST"]);

export function classifyJoinError(error: unknown): JoinError {
  if (error instanceof TRPCClientError && REJECTED_CODES.has(error.data?.code ?? "")) {
    return "rejected";
  }
  return "network";
}
