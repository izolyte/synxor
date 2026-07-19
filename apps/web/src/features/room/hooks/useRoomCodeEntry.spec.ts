import { useRoomCodeEntry } from "~/features/room/hooks/useRoomCodeEntry";
import { renderHook } from "~test/kit/component";
import { expect, fn, suite, test } from "~test/kit";

const base = { pending: false, error: null, onJoin: fn(), onErrorClear: fn() } as const;

suite("useRoomCodeEntry", () => {
  test("sanitizes the initial code", () => {
    const { current } = renderHook(() => useRoomCodeEntry({ ...base, initialCode: "ab-c123" }));
    expect(current.code).toBe("ABC123");
    expect(current.complete).toBe(true);
  });

  test("submits once when complete, latching out a double fire", () => {
    const onJoin = fn<[string], void>();
    const { current } = renderHook(() =>
      useRoomCodeEntry({ ...base, onJoin, initialCode: "ABC123" }),
    );

    current.submitCurrent();
    current.submitCurrent();

    expect(onJoin.calls.length).toBe(1);
    expect(onJoin.calls[0][0]).toBe("ABC123");
  });

  test("auto-submits a complete prefilled code once (shared-link join)", () => {
    const onJoin = fn<[string], void>();
    renderHook(() => useRoomCodeEntry({ ...base, onJoin, initialCode: "ab-c123" }));

    expect(onJoin.calls.length).toBe(1);
    expect(onJoin.calls[0][0]).toBe("ABC123");
  });

  test("does not auto-submit an incomplete prefilled code", () => {
    const onJoin = fn();
    renderHook(() => useRoomCodeEntry({ ...base, onJoin, initialCode: "AB" }));

    expect(onJoin.calls.length).toBe(0);
  });

  test("does not submit while incomplete", () => {
    const onJoin = fn();
    const { current } = renderHook(() => useRoomCodeEntry({ ...base, onJoin, initialCode: "AB" }));

    current.submitCurrent();

    expect(onJoin.calls.length).toBe(0);
  });

  test("completeWith submits a freshly completed code, uppercased", () => {
    const onJoin = fn<[string], void>();
    const { current } = renderHook(() => useRoomCodeEntry({ ...base, onJoin }));

    current.completeWith("xyz789");

    expect(onJoin.calls.length).toBe(1);
    expect(onJoin.calls[0][0]).toBe("XYZ789");
  });

  test("a rejected code clears the field and shakes", () => {
    const { current } = renderHook(() =>
      useRoomCodeEntry({ ...base, error: "rejected", initialCode: "ABC123" }),
    );

    expect(current.code).toBe("");
    expect(current.shaking).toBe(true);
  });
});
