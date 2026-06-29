// Behavior contract for the shared InputOTP primitive. Generic fixtures, no app
// vocabulary — and no className assertions (CSS is off in jsdom; roving focus is
// input-otp's own concern).

import { createRef, useState } from "react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "~/shared/ui/input-otp";
import { expect, fn, suite, test } from "~test/kit";
import { renderComponent } from "~test/kit/component";

function Host({ onComplete }: { onComplete?: (value: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <InputOTP
      maxLength={4}
      value={value}
      onChange={setValue}
      onComplete={onComplete}
      aria-label="code"
    >
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
      </InputOTPGroup>
    </InputOTP>
  );
}

suite("InputOTP", () => {
  test("records typed characters", async () => {
    const screen = renderComponent(<Host />);
    await screen.find({ role: "textbox", name: "code" }).type("12ab");
    await screen.find({ role: "textbox", name: "code" }).shouldHaveValue("12ab");
  });

  test("fires onComplete once the field is full", async () => {
    const onComplete = fn<[string], void>();
    const screen = renderComponent(<Host onComplete={onComplete} />);
    await screen.find({ role: "textbox", name: "code" }).type("12ab");
    expect(onComplete.calls[0][0]).toBe("12ab");
  });

  test("reflects typed characters in the slots", async () => {
    // The slots mirror OTPInputContext, so each typed character renders in a cell.
    const screen = renderComponent(<Host />);
    await screen.find({ role: "textbox", name: "code" }).type("12ab");
    await screen.find({ text: "1" }).shouldBeVisible();
    await screen.find({ text: "b" }).shouldBeVisible();
  });

  test("forwards the input ref so callers can focus it", () => {
    // JoinRoomForm relies on this to refocus the field after a rejected code.
    const ref = createRef<HTMLInputElement>();
    renderComponent(
      <InputOTP ref={ref} maxLength={4} value="" onChange={() => {}} aria-label="code">
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
      </InputOTP>,
    );
    ref.current?.focus();
    expect(document.activeElement).toBe(ref.current);
  });
});
