// Proves the frontend infers its contract from AppRouter, not hand-written DTOs:
// tsc fails here if a procedure's shape drifts.

import type { RouterInputs, RouterOutputs } from "~/shared/services/trpc";
import { resolveTrpcUrl } from "~/shared/services/trpc";
import { expect, suite, test } from "~test/kit";

suite("trpc contract inference", () => {
  test("room.create output is inferred from the backend router", () => {
    const output: RouterOutputs["room"]["create"] = {
      roomCode: "ABC123",
      roomToken: "token",
      expiresAt: "2099-01-01T00:00:00.000Z",
    };
    expect(Object.keys(output)).toEqual(["roomCode", "roomToken", "expiresAt"]);
  });

  test("room.join input is inferred from the backend router", () => {
    const input: RouterInputs["room"]["join"] = { roomCode: "ABC123" };
    expect(input.roomCode).toBe("ABC123");
  });
});

suite("resolveTrpcUrl", () => {
  test("uses VITE_API_URL when set, trimming trailing slashes", () => {
    expect(resolveTrpcUrl({ VITE_API_URL: "https://api.example.com/", DEV: false })).toBe(
      "https://api.example.com/trpc",
    );
  });

  test("does not double the /trpc suffix when the base already includes it", () => {
    expect(resolveTrpcUrl({ VITE_API_URL: "https://api.example.com/trpc", DEV: false })).toBe(
      "https://api.example.com/trpc",
    );
  });

  test("falls back to localhost in dev when unset", () => {
    expect(resolveTrpcUrl({ DEV: true })).toBe("http://localhost:3000/trpc");
  });

  test("throws when unset outside dev", () => {
    expect(() => resolveTrpcUrl({ DEV: false })).toThrow();
  });
});
