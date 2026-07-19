import { renderHook } from "@testing-library/react";
import { afterEach, expect, vi } from "vitest";
import { suite, test } from "~test/kit";
import { useTransferLogRows, type UseTransferLogRowsArgs } from "~/features/room/hooks/useTransferLog";
import type { TransferProgressPayload } from "~/features/room/constants/transfer";

function progress(over: Partial<TransferProgressPayload> = {}): TransferProgressPayload {
  return {
    transferId: "p1",
    fileName: "clip.mp4",
    fileSizeBytes: 2048,
    receivedChunks: 1,
    totalChunks: 4,
    complete: false,
    ...over,
  };
}

function args(over: Partial<UseTransferLogRowsArgs> = {}): UseTransferLogRowsArgs {
  return {
    history: [],
    transfers: [],
    texts: [],
    delivered: new Set<string>(),
    token: undefined,
    apiOrigin: undefined,
    ...over,
  };
}

suite("useTransferLogRows", () => {
  afterEach(() => vi.restoreAllMocks());

  test("pins a live Transfer's first-seen time across re-renders", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);
    const { result, rerender } = renderHook((props: UseTransferLogRowsArgs) => useTransferLogRows(props), {
      initialProps: args({ transfers: [progress({ receivedChunks: 1 })] }),
    });
    expect(result.current[0].receivedAt).toBe(1000);

    // A later progress event for the same Transfer must not bump the timestamp.
    vi.spyOn(Date, "now").mockReturnValue(5000);
    rerender(args({ transfers: [progress({ receivedChunks: 3 })] }));
    expect(result.current[0].receivedAt).toBe(1000);
  });

  test("builds a download href for file rows only when token and origin are present", () => {
    const withSession = renderHook(() =>
      useTransferLogRows(args({ transfers: [progress()], token: "tok", apiOrigin: "http://api.test" })),
    );
    expect(withSession.result.current[0].href).toContain("http://api.test");

    const withoutSession = renderHook(() => useTransferLogRows(args({ transfers: [progress()] })));
    expect(withoutSession.result.current[0].href).toBeUndefined();
  });
});
