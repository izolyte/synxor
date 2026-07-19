// Synxor's test vocabulary: the semantic locators and copy for the UI that
// exists. Specs reach for these so no raw role names or strings leak into tests.
// This grows one entry per feature as pages land.
//
// Note the boundary: selectors and copy describe the *UI surface*, which is a
// frontend/test concern and rightly lives here. Domain *data types* (room
// shapes, expiry values) do NOT — those come from the backend tRPC `AppRouter`
// by inference, never hand-written in test.

import type { ActionableSelector, ReadonlySelector } from "~test/kit";

export const copy = {
  app: {
    notFound: "Page not found.",
  },
  createRoom: {
    heading: "New Room",
    expiryLabel: "Expires after",
    expiry: {
      "1h": "1 hour",
      "24h": "24 hours",
      "7d": "7 days",
    },
    cta: "Create Room",
    error: "Couldn't create the Room. Try again.",
  },
  joinRoom: {
    heading: "Join Room",
    hint: "Enter the code from the sender.",
    codeLabel: "Room Code",
    cta: "Join Room",
    error: {
      rejected: "Room not found or expired.",
      network: "Couldn't reach the server. Check your connection and try again.",
    },
  },
  room: {
    heading: {
      ready: "Room ready",
      expired: "Room expired",
      unavailable: "Room unavailable",
    },
    copyCode: "Copy code",
    copiedCode: "Copied",
    copyLink: "Copy link",
    copiedLink: "Link copied",
    waiting: "Waiting for Receiver",
    connected: "Receiver connected",
    createNew: "Create a new Room",
  },
  // The live transfer surface, split by side: what the Sender does (send a file,
  // paste text) and what the Receiver does (download, copy). Delivery is the shared
  // end state both sides land on.
  transfer: {
    // Sender's hidden file input inside the drop zone (data-testid).
    dropZoneInput: "drop-zone-input",
    compose: {
      label: "Text or link to send",
      send: "Send",
    },
    // Receiver's incoming actions.
    download: "Download",
    copySnippet: "Copy snippet",
    copied: "Copied",
    // Shared: the persistent per-row status, paired with an icon so it never rides
    // on colour alone. Both the Sender's sent row and the Receiver's incoming row
    // carry it once a Transfer lands.
    deliveredStatus: "Status: Delivered",
  },
} as const;

export const selectors = {
  app: {
    notFound: { text: copy.app.notFound } as const satisfies ReadonlySelector,
  },
  createRoom: {
    heading: {
      role: "heading",
      name: copy.createRoom.heading,
    } as const satisfies ActionableSelector,
    cta: {
      role: "button",
      name: copy.createRoom.cta,
    } as const satisfies ActionableSelector,
    expiryOption: (key: keyof typeof copy.createRoom.expiry) =>
      ({ role: "radio", name: copy.createRoom.expiry[key] }) as const satisfies ActionableSelector,
    error: { text: copy.createRoom.error } as const satisfies ReadonlySelector,
  },
  joinRoom: {
    heading: {
      role: "heading",
      name: copy.joinRoom.heading,
    } as const satisfies ActionableSelector,
    input: {
      role: "textbox",
      name: copy.joinRoom.codeLabel,
    } as const satisfies ActionableSelector,
    cta: {
      role: "button",
      name: copy.joinRoom.cta,
    } as const satisfies ActionableSelector,
    error: (kind: keyof typeof copy.joinRoom.error) =>
      ({ text: copy.joinRoom.error[kind] }) as const satisfies ReadonlySelector,
  },
  room: {
    heading: (state: keyof typeof copy.room.heading) =>
      ({ role: "heading", name: copy.room.heading[state] }) as const satisfies ActionableSelector,
    code: (code: string) => ({ text: code }) as const satisfies ReadonlySelector,
    copyCode: { role: "button", name: copy.room.copyCode } as const satisfies ActionableSelector,
    copyLink: { role: "button", name: copy.room.copyLink } as const satisfies ActionableSelector,
    copiedCode: { text: copy.room.copiedCode } as const satisfies ReadonlySelector,
    copiedLink: { text: copy.room.copiedLink } as const satisfies ReadonlySelector,
    waiting: { text: copy.room.waiting } as const satisfies ReadonlySelector,
    connected: { text: copy.room.connected } as const satisfies ReadonlySelector,
    createNew: {
      role: "link",
      name: copy.room.createNew,
    } as const satisfies ActionableSelector,
  },
  transfer: {
    dropZoneInput: { testId: copy.transfer.dropZoneInput } as const satisfies ActionableSelector,
    compose: { label: copy.transfer.compose.label } as const satisfies ActionableSelector,
    send: { role: "button", name: copy.transfer.compose.send } as const satisfies ActionableSelector,
    // The incoming file's Download is an anchor (role "link"), the snippet Copy a
    // button — each named by the affordance the Receiver reaches for. `exact` so
    // the plain "Download" doesn't also match the Transfer Log row's "Download
    // <file>" link.
    download: {
      role: "link",
      name: copy.transfer.download,
      exact: true,
    } as const satisfies ActionableSelector,
    copySnippet: {
      role: "button",
      name: copy.transfer.copySnippet,
    } as const satisfies ActionableSelector,
    copied: { text: copy.transfer.copied } as const satisfies ReadonlySelector,
    // The status span is labelled, not roled — match it by its accessible name so
    // one selector serves both the Sender's and the Receiver's Delivered row.
    delivered: { label: copy.transfer.deliveredStatus } as const satisfies ActionableSelector,
    // A snippet/link the Receiver received, matched by the content that was sent.
    incomingText: (content: string) =>
      ({ text: content }) as const satisfies ReadonlySelector,
  },
};

