import type { Expiry } from "~/features/room/types/expiry";

// Display order; the values are the contract enum (see types/expiry), so dropping
// or renaming an option on the backend surfaces as a type error rather than drift.
export const EXPIRY_OPTIONS: readonly { value: Expiry; label: string }[] = [
  { value: "1h", label: "1 hour" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
];

export const DEFAULT_EXPIRY: Expiry = "24h";
