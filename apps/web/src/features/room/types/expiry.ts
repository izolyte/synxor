import type { RouterInputs } from "~/shared/services/trpc";

// Room Expiry, derived from the backend contract so the options can't drift from
// what the API accepts.
export type Expiry = RouterInputs["room"]["create"]["expiry"];
