// Synxor's test vocabulary: the semantic locators and copy for the UI that
// exists. Specs reach for these so no raw role names or strings leak into tests.
// This grows one entry per feature as pages land.
//
// Note the boundary: selectors and copy describe the *UI surface*, which is a
// frontend/test concern and rightly lives here. Domain *data types* (room
// shapes, expiry values) do NOT — those come from the backend tRPC `AppRouter`
// by inference, never hand-written in test.

import type { ActionableSelector } from "~test/kit";

export const copy = {
  app: {
    transfer: "Transfer",
  },
} as const;

export const selectors = {
  app: {
    transferCta: { role: "button", name: copy.app.transfer } as const satisfies ActionableSelector,
  },
};
