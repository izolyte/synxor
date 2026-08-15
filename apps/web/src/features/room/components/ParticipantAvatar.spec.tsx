import { suite, test } from "~test/kit";
import { renderComponent } from "~test/kit/component";
import { ParticipantAvatar } from "~/features/room/components/ParticipantAvatar";

suite("ParticipantAvatar", () => {
  test("shows initials from the first two words of the name", async () => {
    const screen = renderComponent(<ParticipantAvatar name="Indigo Heron" colorKey="indigo" />);
    await screen.find({ text: "IH" }).shouldBeVisible();
  });

  test("uses a single initial for a one-word name", async () => {
    const screen = renderComponent(<ParticipantAvatar name="Alice" colorKey="rose" />);
    await screen.find({ text: "A" }).shouldBeVisible();
  });
});
