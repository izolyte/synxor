import { suite, test } from "~test/kit";
import { renderComponent } from "~test/kit/component";
import { RoomMenu } from "~/features/room/components/RoomMenu";

suite("RoomMenu", () => {
  test("keeps its contents hidden until the kebab is opened", async () => {
    const screen = renderComponent(
      <RoomMenu>
        <button type="button">Delete Room</button>
      </RoomMenu>,
    );

    await screen.find({ role: "button", name: "Delete Room" }).shouldNotExist();

    await screen.find({ role: "button", name: "Room menu" }).click();
    await screen.find({ role: "button", name: "Delete Room" }).shouldBeVisible();
  });

  test("closes on Escape", async () => {
    const screen = renderComponent(
      <RoomMenu>
        <button type="button">Delete Room</button>
      </RoomMenu>,
    );

    await screen.find({ role: "button", name: "Room menu" }).click();
    await screen.find({ role: "button", name: "Delete Room" }).shouldBeVisible();

    await screen.find({ role: "button", name: "Room menu" }).press("Escape");
    await screen.find({ role: "button", name: "Delete Room" }).shouldNotExist();
  });
});
