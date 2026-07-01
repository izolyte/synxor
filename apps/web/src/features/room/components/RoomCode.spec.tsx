import { useState } from "react";
import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { RoomCode } from "~/features/room/components/RoomCode";

// Drives the one transition that matters: a Receiver joining (count rises), which
// is the only thing that should fire the badge pulse.
function JoinHarness() {
  const [count, setCount] = useState(0);
  return (
    <>
      <RoomCode code="A3K9P2" receiverCount={count} />
      <button onClick={() => setCount(1)}>join</button>
    </>
  );
}

suite("RoomCode", () => {
  test("shows the code and labels it for screen readers", async () => {
    const screen = renderComponent(<RoomCode code="A3K9P2" />);

    await screen.find({ text: "A3K9P2" }).shouldBeVisible();
    // Visible text stays unspaced (clean copy); the label spells it for screen readers.
    await screen.find({ text: "A3K9P2" }).shouldHaveAttribute("aria-label", "Room Code: A 3 K 9 P 2");
  });

  test("pulses the badge when a Receiver joins", async () => {
    const screen = renderComponent(<JoinHarness />);

    await screen.find({ role: "button", name: "join" }).click();
    await screen.find({ text: "A3K9P2" }).shouldHaveAttribute("class", /badge-pulse/);
  });
});
