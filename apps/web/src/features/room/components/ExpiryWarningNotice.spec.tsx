import { useState } from "react";
import { act, fireEvent, screen as rtlScreen } from "@testing-library/react";
import { expect, vi } from "vitest";
import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { ExpiryWarningNotice } from "~/features/room/components/ExpiryWarningNotice";
import type { CountdownPhase } from "~/features/room/types/countdown";

// Short display window so the auto-dismiss is deterministic without a real wait.
function Harness({ initial }: { initial: CountdownPhase | undefined }) {
  const [phase, setPhase] = useState<CountdownPhase | undefined>(initial);
  const [, bump] = useState(0);
  return (
    <>
      <ExpiryWarningNotice phase={phase} displayMs={100} />
      <button onClick={() => setPhase("expiring")}>to-expiring</button>
      {/* A re-render with the phase unchanged — stands in for a countdown tick. */}
      <button onClick={() => bump((n) => n + 1)}>tick</button>
    </>
  );
}

function notice() {
  return rtlScreen.queryByRole("alert");
}

suite("ExpiryWarningNotice", () => {
  test("fires once as the countdown crosses into the warning window", () => {
    renderComponent(<Harness initial="live" />);
    expect(notice()).toBeNull();

    act(() => fireEvent.click(rtlScreen.getByText("to-expiring")));
    expect(notice()).toBeVisible();
    expect(notice()).toHaveTextContent("expiring soon");
  });

  test("warns immediately when a Room is opened already inside the window", () => {
    renderComponent(<Harness initial="expiring" />);
    expect(notice()).toBeVisible();
  });

  test("stays quiet while live and for a Room that opens already expired", () => {
    renderComponent(<Harness initial="live" />);
    expect(notice()).toBeNull();

    renderComponent(<Harness initial="expired" />);
    expect(notice()).toBeNull();
  });

  test("clears itself and never re-fires on later ticks", () => {
    vi.useFakeTimers();
    try {
      renderComponent(<Harness initial="expiring" />);
      expect(notice()).toBeVisible();

      act(() => vi.advanceTimersByTime(100));
      expect(notice()).toBeNull();

      // The phase is still "expiring"; further ticks must not bring it back.
      act(() => fireEvent.click(rtlScreen.getByText("tick")));
      act(() => vi.advanceTimersByTime(100));
      expect(notice()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
