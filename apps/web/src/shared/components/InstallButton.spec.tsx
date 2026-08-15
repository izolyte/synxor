import { act } from "@testing-library/react";
import { renderComponent } from "~test/kit/component";
import { expect, fn, suite, test } from "~test/kit";
import { InstallButton } from "~/shared/components/InstallButton";
import { PWA_VISITS_KEY } from "~/shared/hooks/usePwaInstall";

function firePrompt() {
  const event = new Event("beforeinstallprompt") as Event & { prompt: ReturnType<typeof fn> };
  event.prompt = fn(() => Promise.resolve());
  (event as unknown as { userChoice: Promise<unknown> }).userChoice = Promise.resolve({
    outcome: "accepted",
  });
  act(() => void window.dispatchEvent(event));
  return event;
}

suite("InstallButton", () => {
  test("renders nothing until a returner has a live prompt", async () => {
    const screen = renderComponent(<InstallButton />);
    firePrompt(); // first-visit: gated out despite the prompt
    await screen.find({ role: "button", name: "Install app" }).shouldNotExist();
  });

  test("reveals the control and fires the prompt on click", async () => {
    localStorage.setItem(PWA_VISITS_KEY, "1"); // this session makes them a returner
    const screen = renderComponent(<InstallButton />);
    const event = firePrompt();

    await screen.find({ role: "button", name: "Install app" }).click();
    expect(event.prompt.calls.length).toBe(1);
  });
});
