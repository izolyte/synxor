// socket.io stops retrying after this many failed reconnect attempts; past it the
// Room can't recover on its own and reads "Lost connection. Refresh to continue."
// (docs/design/15-edge-cases.md). A handful of quick retries covers the common
// blip — a laptop sleeping, a Wi-Fi handoff — without hanging on a dead network.
export const MAX_RECONNECT_ATTEMPTS = 5;
