import { resolveSocketUrl } from "~/features/room/services/room-socket.service";
import { expect, suite, test } from "~test/kit";

suite("resolveSocketUrl", () => {
  test("uses VITE_API_URL as the server origin, trimming trailing slashes", () => {
    expect(resolveSocketUrl({ VITE_API_URL: "https://api.example.com/", DEV: false })).toBe(
      "https://api.example.com",
    );
  });

  test("strips a /trpc suffix so the handshake hits the server root", () => {
    expect(resolveSocketUrl({ VITE_API_URL: "https://api.example.com/trpc", DEV: false })).toBe(
      "https://api.example.com",
    );
  });

  test("falls back to localhost in dev when unset", () => {
    expect(resolveSocketUrl({ DEV: true })).toBe("http://localhost:3000");
  });

  test("throws when unset outside dev", () => {
    expect(() => resolveSocketUrl({ DEV: false })).toThrow();
  });
});
