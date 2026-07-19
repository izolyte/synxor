import { useState } from "react";
import { act, fireEvent, screen as rtlScreen } from "@testing-library/react";
import { expect, vi } from "vitest";
import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { useTransferStall } from "~/features/room/hooks/useTransferStall";

// Fake timers keep the 10s/30s thresholds deterministic without real waits; the
// hook takes injected thresholds (20ms/60ms here) the same way as production reads
// them from constants.
function Harness({ percent = 0, active = true }: { percent?: number; active?: boolean }) {
  const [p, setP] = useState(percent);
  const [live, setLive] = useState(active);
  const stall = useTransferStall(p, live, { slowAfterMs: 20, almostAfterMs: 60 });
  return (
    <>
      <output data-testid="stall">{stall ?? "none"}</output>
      <button onClick={() => setP((v) => v + 10)}>bump</button>
      <button onClick={() => setLive(false)}>stop</button>
    </>
  );
}

function stallText(): string | null {
  return rtlScreen.getByTestId("stall").textContent;
}

suite("useTransferStall", () => {
  test("flags a slow connection once a Transfer stops moving", () => {
    vi.useFakeTimers();
    try {
      renderComponent(<Harness percent={10} />);
      expect(stallText()).toBe("none");

      act(() => vi.advanceTimersByTime(20));
      expect(stallText()).toBe("slow");
    } finally {
      vi.useRealTimers();
    }
  });

  test("rearms from zero on each move, so a live Transfer never reads slow", () => {
    vi.useFakeTimers();
    try {
      renderComponent(<Harness percent={10} />);
      act(() => vi.advanceTimersByTime(20));
      expect(stallText()).toBe("slow");

      // A fresh chunk lands: the stall clears immediately and the clock restarts.
      act(() => fireEvent.click(rtlScreen.getByText("bump")));
      expect(stallText()).toBe("none");

      act(() => vi.advanceTimersByTime(20));
      expect(stallText()).toBe("slow");
    } finally {
      vi.useRealTimers();
    }
  });

  test("softens to almost-done for a Transfer parked near 100%", () => {
    vi.useFakeTimers();
    try {
      renderComponent(<Harness percent={99} />);
      // Past the slow window but not the longer almost-done one: still quiet.
      act(() => vi.advanceTimersByTime(20));
      expect(stallText()).toBe("none");

      act(() => vi.advanceTimersByTime(40));
      expect(stallText()).toBe("almost");
    } finally {
      vi.useRealTimers();
    }
  });

  test("an inactive Transfer never stalls", () => {
    vi.useFakeTimers();
    try {
      renderComponent(<Harness percent={10} active={false} />);
      act(() => vi.advanceTimersByTime(60));
      expect(stallText()).toBe("none");
    } finally {
      vi.useRealTimers();
    }
  });
});
