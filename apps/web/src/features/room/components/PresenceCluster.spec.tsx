import { screen as rtlScreen } from "@testing-library/react";
import { expect } from "vitest";
import { suite, test } from "~test/kit";
import { renderComponent } from "~test/kit/component";
import { selectors } from "~test/app";
import { PresenceCluster } from "~/features/room/components/PresenceCluster";
import type { ParticipantIdentity } from "~/features/room/constants/transfer";

const heron: ParticipantIdentity = { key: "k1", colorKey: "indigo", name: "Indigo Heron" };
const otter: ParticipantIdentity = { key: "k2", colorKey: "amber", name: "Amber Otter" };

suite("PresenceCluster", () => {
  test("renders an avatar per Participant, each carrying its identity", async () => {
    const screen = renderComponent(<PresenceCluster roster={[heron, otter]} self={heron} />);

    await screen.find({ text: "IH" }).shouldBeVisible();
    await screen.find({ text: "AO" }).shouldBeVisible();
  });

  test("shows the live count", async () => {
    const screen = renderComponent(<PresenceCluster roster={[heron, otter]} self={heron} />);
    await screen.find({ text: "2 here" }).shouldBeVisible();
  });

  test("labels presence as activity in the Room, never an account being online", async () => {
    const screen = renderComponent(<PresenceCluster roster={[heron, otter]} self={heron} />);

    await screen.find(selectors.room.presence(2)).shouldBeVisible();
    expect(rtlScreen.queryByText(/online/i)).toBeNull();
  });

  test("shows an empty slot and 'Just you' while alone", async () => {
    const screen = renderComponent(<PresenceCluster roster={[heron]} self={heron} />);

    await screen.find({ text: "Just you" }).shouldBeVisible();
    await screen.find(selectors.room.presenceSolo).shouldBeVisible();
  });

  test("renders nothing until the first roster arrives", () => {
    renderComponent(<PresenceCluster roster={[]} self={undefined} />);
    expect(rtlScreen.queryByRole("group")).toBeNull();
  });
});
