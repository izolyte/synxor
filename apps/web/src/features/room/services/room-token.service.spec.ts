import { RoomTokenService, type RoomTokenStorage } from "~/features/room/services/room-token.service";
import { expect, suite, test } from "~test/kit";

// A fake storage proves the service is decoupled from Web Storage: no jsdom,
// no globals — just the injected abstraction.
function fakeStorage(): RoomTokenStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  };
}

suite("RoomTokenService", () => {
  test("stores and reads a token by room code", () => {
    const service = new RoomTokenService(fakeStorage());
    service.store("ABC123", "tok-1");
    expect(service.get("ABC123")).toBe("tok-1");
  });

  test("isolates tokens per room code", () => {
    const service = new RoomTokenService(fakeStorage());
    service.store("ABC123", "tok-1");
    service.store("XYZ789", "tok-2");
    expect(service.get("XYZ789")).toBe("tok-2");
  });

  test("returns null for an unknown room code", () => {
    const service = new RoomTokenService(fakeStorage());
    expect(service.get("NOPE")).toBe(null);
  });
});
