import { act, renderHook } from "@testing-library/react";
import { expect } from "vitest";
import { suite, test } from "~test/kit";
import { useOwnTransferIds } from "~/features/room/hooks/useOwnTransferIds";

suite("useOwnTransferIds", () => {
  test("records a sent id and keeps it across a reload (fresh hook, same tab)", () => {
    const first = renderHook(() => useOwnTransferIds("ABC123"));
    act(() => first.result.current.add("t1"));
    expect(first.result.current.ids.has("t1")).toBe(true);

    // A reload re-runs the hook against the same per-tab sessionStorage.
    const second = renderHook(() => useOwnTransferIds("ABC123"));
    expect(second.result.current.ids.has("t1")).toBe(true);
  });

  test("scopes ids per Room Code", () => {
    const roomA = renderHook(() => useOwnTransferIds("ROOMA1"));
    act(() => roomA.result.current.add("t1"));

    const roomB = renderHook(() => useOwnTransferIds("ROOMB2"));
    expect(roomB.result.current.ids.has("t1")).toBe(false);
  });
});
