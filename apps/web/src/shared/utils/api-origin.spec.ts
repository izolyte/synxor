import { resolveApiOrigin } from "~/shared/utils/api-origin";
import { expect, suite, test } from "~test/kit";

suite("resolveApiOrigin", () => {
  test("uses VITE_API_URL as the server origin, trimming trailing slashes", () => {
    expect(resolveApiOrigin({ VITE_API_URL: "https://api.example.com/", DEV: false })).toBe(
      "https://api.example.com",
    );
  });

  test("strips a /trpc suffix so callers get the bare server root", () => {
    expect(resolveApiOrigin({ VITE_API_URL: "https://api.example.com/trpc", DEV: false })).toBe(
      "https://api.example.com",
    );
  });

  test("strips /trpc even behind trailing slashes", () => {
    expect(resolveApiOrigin({ VITE_API_URL: "https://api.example.com/trpc/", DEV: false })).toBe(
      "https://api.example.com",
    );
  });

  test("falls back to localhost in dev when unset", () => {
    expect(resolveApiOrigin({ DEV: true })).toBe("http://localhost:3000");
  });

  test("throws when unset outside dev", () => {
    expect(() => resolveApiOrigin({ DEV: false })).toThrow();
  });
});
