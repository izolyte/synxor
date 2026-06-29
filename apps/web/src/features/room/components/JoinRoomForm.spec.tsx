import { JoinRoomForm } from "~/features/room/components/JoinRoomForm";
import { expect, fn, suite, test } from "~test/kit";
import { renderComponent } from "~test/kit/component";
import { selectors } from "~test/app";

suite("JoinRoomForm", () => {
  test("auto-submits, uppercased, once six characters are entered", async () => {
    const onJoin = fn<[string], void>();
    const screen = renderComponent(
      <JoinRoomForm onJoin={onJoin} pending={false} error={null} onErrorClear={fn()} />,
    );

    await screen.find(selectors.joinRoom.input).type("abc123");

    expect(onJoin.calls.length).toBe(1);
    expect(onJoin.calls[0][0]).toBe("ABC123");
  });

  test("uppercases the displayed code", async () => {
    const screen = renderComponent(
      <JoinRoomForm onJoin={fn()} pending={false} error={null} onErrorClear={fn()} />,
    );

    await screen.find(selectors.joinRoom.input).type("abc123");

    await screen.find(selectors.joinRoom.input).shouldHaveValue("ABC123");
  });

  test("keeps submit disabled until the code is complete", async () => {
    const screen = renderComponent(
      <JoinRoomForm onJoin={fn()} pending={false} error={null} onErrorClear={fn()} />,
    );
    await screen.find(selectors.joinRoom.cta).shouldBeDisabled();
  });

  test("disables the field while pending", async () => {
    const screen = renderComponent(
      <JoinRoomForm onJoin={fn()} pending error={null} onErrorClear={fn()} />,
    );
    await screen.find(selectors.joinRoom.input).shouldBeDisabled();
  });

  test("shows the rejected-code message", async () => {
    const screen = renderComponent(
      <JoinRoomForm onJoin={fn()} pending={false} error="rejected" onErrorClear={fn()} />,
    );
    await screen.find(selectors.joinRoom.error("rejected")).shouldBeVisible();
  });

  test("shows a connection message on a network error", async () => {
    const screen = renderComponent(
      <JoinRoomForm onJoin={fn()} pending={false} error="network" onErrorClear={fn()} />,
    );
    await screen.find(selectors.joinRoom.error("network")).shouldBeVisible();
  });

  test("clears the error when the user edits the code", async () => {
    const onErrorClear = fn();
    const screen = renderComponent(
      <JoinRoomForm onJoin={fn()} pending={false} error="rejected" onErrorClear={onErrorClear} />,
    );

    await screen.find(selectors.joinRoom.input).type("a");

    expect(onErrorClear.calls.length).toBe(1);
  });
});
