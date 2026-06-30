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
    createNew: "Create a new Room",
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
    createNew: {
      role: "link",
      name: copy.room.createNew,
    } as const satisfies ActionableSelector,
  },
};

