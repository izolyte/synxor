import { renderComponent } from "~test/kit/component";
import { suite, test } from "~test/kit";
import { RoomCode } from "~/features/room/components/RoomCode";

suite("RoomCode", () => {
  test("shows the code and labels it for screen readers", async () => {
    const screen = renderComponent(<RoomCode code="A3K9P2" />);

    await screen.find({ text: "A3K9P2" }).shouldBeVisible();
    // Visible text stays unspaced (clean copy); the label spells it for screen readers.
    await screen.find({ text: "A3K9P2" }).shouldHaveAttribute("aria-label", "Room Code: A 3 K 9 P 2");
  });
});
