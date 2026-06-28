import type { Expiry } from "~/features/room/types/expiry";

// Exhaustive over Expiry: adding a value to the backend contract fails to compile
// here until it gets a label. Display order = key order below.
const EXPIRY_LABELS: Record<Expiry, string> = {
  "1h": "1 hour",
  "24h": "24 hours",
  "7d": "7 days",
};

export const EXPIRY_OPTIONS: readonly { value: Expiry; label: string }[] = (
  Object.keys(EXPIRY_LABELS) as Expiry[]
).map((value) => ({ value, label: EXPIRY_LABELS[value] }));

export const DEFAULT_EXPIRY: Expiry = "24h";
