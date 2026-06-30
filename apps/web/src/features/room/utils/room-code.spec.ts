import { sanitizeRoomCode } from "~/features/room/utils/room-code";
import { expect, suite, test } from "~test/kit";

suite("sanitizeRoomCode", () => {
  test("uppercases and strips non-alphanumerics", () => {
    expect(sanitizeRoomCode("ab-c1 2")).toBe("ABC12");
  });

  test("keeps the last six characters of a longer paste", () => {
    expect(sanitizeRoomCode("https://x/room/ABC123")).toBe("ABC123");
  });

  test("passes a clean six-char code through", () => {
    expect(sanitizeRoomCode("ABC123")).toBe("ABC123");
  });

  test("treats non-string input as empty (never throws)", () => {
    expect(sanitizeRoomCode(undefined)).toBe("");
    expect(sanitizeRoomCode(null)).toBe("");
    expect(sanitizeRoomCode(["ABC", "DEF"])).toBe("");
    expect(sanitizeRoomCode(123)).toBe("");
  });
});
