import { useState } from "react";
import { screen as rtlScreen, waitFor } from "@testing-library/react";
import { expect } from "vitest";
import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { DeliveryFlash } from "~/features/room/components/DeliveryFlash";
import type { TransferProgressPayload } from "~/features/room/constants/transfer";
import { delay } from "~/shared/utils/delay";

function progress(id: string, name: string): TransferProgressPayload {
  return {
    transferId: id,
    fileName: name,
    fileSizeBytes: 1024,
    receivedChunks: 2,
    totalChunks: 2,
    complete: true,
  };
}

// Drives the flash the way the Room does: a delivery lands after mount by growing
// the delivered set. `initial` seeds ids as already-delivered before mount.
function Harness({
  displayMs,
  initial = [],
  withTransfer = true,
}: {
  displayMs?: number;
  initial?: string[];
  withTransfer?: boolean;
}) {
  const [delivered, setDelivered] = useState<ReadonlySet<string>>(new Set(initial));
  const transfers = withTransfer ? [progress("t1", "photo.jpg")] : [];
  return (
    <>
      <button onClick={() => setDelivered((prev) => new Set(prev).add("t1"))}>deliver</button>
      <DeliveryFlash delivered={delivered} transfers={transfers} displayMs={displayMs} />
    </>
  );
}

suite("DeliveryFlash", () => {
  test("raises a Delivered flash naming the file, and announces it politely", async () => {
    const screen = renderComponent(<Harness displayMs={1000} />);

    // The live region is always mounted (so it can announce a change), but the
    // visible flash is only there for a live delivery, not as a resting state.
    await screen.find({ text: "Delivered" }).shouldNotExist();

    await screen.find({ role: "button", name: "deliver" }).click();

    await screen.find({ text: "Delivered" }).shouldBeVisible();
    await screen.find({ text: "photo.jpg" }).shouldBeVisible();
    await screen.find({ role: "status" }).shouldHaveText("Transfer delivered: photo.jpg");
  });

  test("still confirms delivery when the file name isn't known yet", async () => {
    const screen = renderComponent(<Harness displayMs={1000} withTransfer={false} />);

    await screen.find({ role: "button", name: "deliver" }).click();

    await screen.find({ text: "Delivered" }).shouldBeVisible();
    await screen.find({ text: "photo.jpg" }).shouldNotExist();
    await screen.find({ role: "status" }).shouldHaveText("Transfer delivered");
  });

  test("clears itself after its window so it fires once, never lingering", async () => {
    const screen = renderComponent(<Harness displayMs={30} />);

    await screen.find({ role: "button", name: "deliver" }).click();
    await screen.find({ text: "Delivered" }).shouldBeVisible();

    // waitFor flushes the timer-driven removal inside act, then confirms it's gone.
    await waitFor(() => expect(rtlScreen.queryByText("Delivered")).toBeNull());
  });

  test("doesn't replay deliveries that were already done on mount", async () => {
    const screen = renderComponent(<Harness displayMs={1000} initial={["earlier"]} />);

    // A delivery from before this Receiver was looking is history, not a flash.
    await delay(20);
    await screen.find({ text: "Delivered" }).shouldNotExist();

    // A fresh delivery after mount still flashes.
    await screen.find({ role: "button", name: "deliver" }).click();
    await screen.find({ text: "Delivered" }).shouldBeVisible();
  });
});
