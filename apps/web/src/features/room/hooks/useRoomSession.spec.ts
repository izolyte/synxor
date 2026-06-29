import { useRoomSession } from "~/features/room/hooks/useRoomSession";
import { roomSessionService } from "~/features/room/services/room-session.service";
import { renderHook } from "~test/kit/component";
import { expect, suite, test } from "~test/kit";

suite("useRoomSession", () => {
  test("resolves to a held session", () => {
    roomSessionService.store("ABC123", { token: "tok", expiresAt: "2099-01-01T00:00:00.000Z" });

    const { current } = renderHook(() => useRoomSession("ABC123"));

    expect(current.status).toBe("ready");
    if (current.status === "ready") expect(current.session.token).toBe("tok");
  });

  test("reports missing when no session is held", () => {
    const { current } = renderHook(() => useRoomSession("NOPE12"));

    expect(current.status).toBe("missing");
  });
});
