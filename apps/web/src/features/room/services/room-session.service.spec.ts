import {
  RoomSessionService,
  sessionRole,
  type RoomSessionStorage,
} from "~/features/room/services/room-session.service";
import { expect, suite, test } from "~test/kit";

// A fake storage proves the service is decoupled from Web Storage: no jsdom,
// no globals — just the injected abstraction.
function fakeStorage(): RoomSessionStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  };
}

suite("RoomSessionService", () => {
  test("stores and reads a session by room code", () => {
    const service = new RoomSessionService(fakeStorage());
    service.store("ABC123", { token: "tok-1", expiresAt: "2099-01-01T00:00:00.000Z" });
    expect(service.get("ABC123")).toEqual({
      token: "tok-1",
      expiresAt: "2099-01-01T00:00:00.000Z",
    });
  });

  test("keeps a token-only session (Receiver has no expiry)", () => {
    const service = new RoomSessionService(fakeStorage());
    service.store("ABC123", { token: "tok-1" });
    expect(service.get("ABC123")).toEqual({ token: "tok-1" });
  });

  test("isolates sessions per room code", () => {
    const service = new RoomSessionService(fakeStorage());
    service.store("ABC123", { token: "tok-1" });
    service.store("XYZ789", { token: "tok-2" });
    expect(service.get("XYZ789")).toEqual({ token: "tok-2" });
  });

  test("returns null for an unknown room code", () => {
    const service = new RoomSessionService(fakeStorage());
    expect(service.get("NOPE")).toBe(null);
  });

  test("reads stale or malformed storage as no session", () => {
    const storage = fakeStorage();
    storage.setItem("synxor.room.BAD123.session", "not json");
    storage.setItem("synxor.room.OLD123.session", JSON.stringify({ noToken: true }));
    storage.setItem(
      "synxor.room.TAMPER123.session",
      JSON.stringify({ token: "tok-1", expiresAt: 123 }),
    );
    const service = new RoomSessionService(storage);
    expect(service.get("BAD123")).toBe(null);
    expect(service.get("OLD123")).toBe(null);
    expect(service.get("TAMPER123")).toBe(null);
  });

  test("round-trips the session role", () => {
    const service = new RoomSessionService(fakeStorage());
    service.store("ABC123", { token: "tok-1", role: "receiver" });
    expect(service.get("ABC123")).toEqual({ token: "tok-1", role: "receiver" });
  });

  test("rejects a session with a role outside the known pair", () => {
    const storage = fakeStorage();
    storage.setItem(
      "synxor.room.ROLE123.session",
      JSON.stringify({ token: "tok-1", role: "admin" }),
    );
    const service = new RoomSessionService(storage);
    expect(service.get("ROLE123")).toBe(null);
  });
});

suite("sessionRole", () => {
  test("returns the stored role when present", () => {
    expect(sessionRole({ token: "tok", role: "receiver" })).toBe("receiver");
    expect(sessionRole({ token: "tok", role: "sender" })).toBe("sender");
  });

  test("infers Sender from an expiry on a legacy session (no role field)", () => {
    expect(sessionRole({ token: "tok", expiresAt: "2099-01-01T00:00:00.000Z" })).toBe("sender");
  });

  test("infers Receiver from a legacy session without an expiry", () => {
    expect(sessionRole({ token: "tok" })).toBe("receiver");
  });

  test("prefers an explicit role over the expiry heuristic", () => {
    expect(
      sessionRole({ token: "tok", expiresAt: "2099-01-01T00:00:00.000Z", role: "receiver" }),
    ).toBe("receiver");
  });
});
