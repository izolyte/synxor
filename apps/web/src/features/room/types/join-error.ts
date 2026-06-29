// How a join attempt failed, as far as the UI needs to tell the user apart:
//   network  — the request never reached the server (offline, timeout); the code
//              is probably fine, so retrying it is the right move.
//   rejected — the server refused the code (not found or expired); retype.
// The backend doesn't yet separate "not found" from "expired", so both collapse
// into `rejected`.
export type JoinError = "network" | "rejected";
