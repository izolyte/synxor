// Proves the frontend infers its contract from AppRouter, not hand-written DTOs:
// tsc fails here if a procedure's shape drifts.

import type { RouterInputs, RouterOutputs } from "~/lib/trpc";
import { expect, suite, test } from "~test/kit";

suite("trpc contract inference", () => {
  test("room.create output is inferred from the backend router", () => {
    const output: RouterOutputs["room"]["create"] = {
      roomCode: "ABC123",
      roomToken: "token",
    };
    expect(Object.keys(output)).toEqual(["roomCode", "roomToken"]);
  });

  test("room.join input is inferred from the backend router", () => {
    const input: RouterInputs["room"]["join"] = { roomCode: "ABC123" };
    expect(input.roomCode).toBe("ABC123");
  });
});
