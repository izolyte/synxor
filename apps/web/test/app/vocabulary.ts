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
    // The landing's display headline doubles as the page heading.
    heading: "Send it. It vanishes.",
    expiry: {
      "1h": "1 hour",
      "24h": "24 hours",
      "7d": "7 days",
    },
    cta: "Create a room",
    joinLink: "Join a room",
    error: "Couldn't create the Room. Try again.",
  },
  joinRoom: {
    heading: "Enter the code",
    hint: "Six characters from whoever made the room.",
    eyebrow: "Join a room",
    scan: "— or scan from their screen —",
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
      expired: "This Room has expired",
      closed: "This Room is closed",
      // No held session for the code — the helper that offers the way in.
      codeRequired: "This Room needs its code",
    },
    copyCode: "Copy code",
    copiedCode: "Copied",
    copyLink: "Copy link",
    copiedLink: "Link copied",
    // The waiting room doubles as the share surface: an invite headline, the
    // scannable QR, and the "still alone" cue the Sender sees until someone joins.
    shareHeading: "Room's ready — bring someone in",
    qr: "Room join QR code",
    waiting: "Waiting for someone to join…",
    connected: "Receiver connected",
    createNew: "Start a new Room",
    // The no-session helper's way in: enter the code, prefilled from the link.
    joinWithCode: "Enter a code",
    // Sender's teardown control and its two-step confirm.
    deleteRoom: "Delete Room",
    confirmDelete: "Yes, delete",
    cancelDelete: "Keep Room",
    deleteError: "Couldn't close the Room — try again.",
    // The two terminal Room states a Participant lands on.
    expiredMessage:
      "The conversation and every file are permanently gone — that's the point. Nothing is stored, nothing to clean up.",
    // What a kicked Participant (or the Sender mid-redirect) sees.
    closedMessage: "The Sender closed this Room. Start a new Room to send more.",
    // The header presence cluster. Its accessible name frames presence as activity
    // in the Room, never an account being "online". The visible count sits beside
    // the avatar stack.
    presence: {
      active: (count: number) => `${count} people active in this Room`,
      solo: "You're the only one active in this Room — waiting for someone to join",
      soloCount: "Just you",
      count: (count: number) => `${count} here`,
    },
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
    // An incoming Link is one card-shaped anchor; its name is "Open <url>".
    openLink: "Open",
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
    joinLink: {
      role: "link",
      name: copy.createRoom.joinLink,
    } as const satisfies ActionableSelector,
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
    eyebrow: { text: copy.joinRoom.eyebrow } as const satisfies ReadonlySelector,
    scan: { text: copy.joinRoom.scan } as const satisfies ReadonlySelector,
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
    shareHeading: {
      role: "heading",
      name: copy.room.shareHeading,
    } as const satisfies ActionableSelector,
    qr: { testId: "room-qr" } as const satisfies ActionableSelector,
    waiting: { text: copy.room.waiting } as const satisfies ReadonlySelector,
    connected: { text: copy.room.connected } as const satisfies ReadonlySelector,
    createNew: {
      role: "link",
      name: copy.room.createNew,
    } as const satisfies ActionableSelector,
    joinWithCode: {
      role: "link",
      name: copy.room.joinWithCode,
    } as const satisfies ActionableSelector,
    expiredMessage: { text: copy.room.expiredMessage } as const satisfies ReadonlySelector,
    closedMessage: { text: copy.room.closedMessage } as const satisfies ReadonlySelector,
    deleteRoom: { role: "button", name: copy.room.deleteRoom } as const satisfies ActionableSelector,
    confirmDelete: {
      role: "button",
      name: copy.room.confirmDelete,
    } as const satisfies ActionableSelector,
    cancelDelete: {
      role: "button",
      name: copy.room.cancelDelete,
    } as const satisfies ActionableSelector,
    deleteError: { text: copy.room.deleteError } as const satisfies ReadonlySelector,
    // The header presence roster, matched by the group's accessible name — the
    // count-carrying variant when others are here, the solo variant when alone.
    presence: (count: number) =>
      ({ role: "group", name: copy.room.presence.active(count) }) as const satisfies ActionableSelector,
    presenceSolo: { role: "group", name: copy.room.presence.solo } as const satisfies ActionableSelector,
  },
  transfer: {
    dropZoneInput: { testId: copy.transfer.dropZoneInput } as const satisfies ActionableSelector,
    compose: { label: copy.transfer.compose.label } as const satisfies ActionableSelector,
    send: { role: "button", name: copy.transfer.compose.send } as const satisfies ActionableSelector,
    // The file card's download is an anchor (role "link"), the snippet Copy a
    // button — each named by the affordance the Receiver reaches for. The
    // redesigned card names it "Download <file>", so match "Download" as a prefix
    // (no `exact`) rather than the old standalone button.
    download: {
      role: "link",
      name: copy.transfer.download,
    } as const satisfies ActionableSelector,
    copySnippet: {
      role: "button",
      name: copy.transfer.copySnippet,
    } as const satisfies ActionableSelector,
    copied: { text: copy.transfer.copied } as const satisfies ReadonlySelector,
    // The status span is labelled, not roled — match it by its accessible name so
    // one selector serves both the Sender's and the Receiver's Delivered row.
    delivered: { label: copy.transfer.deliveredStatus } as const satisfies ActionableSelector,
    // A snippet the Receiver received, matched by the content that was sent.
    incomingText: (content: string) =>
      ({ text: content }) as const satisfies ReadonlySelector,
    // A received Link renders as a preview card — the whole card is one anchor
    // named "Open <url>", not the bare URL text a snippet carries.
    openLink: (url: string) =>
      ({ role: "link", name: `${copy.transfer.openLink} ${url}` }) as const satisfies ActionableSelector,
    // The shared Room stream region — scope to it when a status (Delivered) also
    // appears elsewhere, so the assertion targets exactly one element.
    log: { role: "region", name: "Room stream" } as const satisfies ActionableSelector,
  },
};

