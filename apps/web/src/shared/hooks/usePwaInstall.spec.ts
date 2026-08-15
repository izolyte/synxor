import { act } from "@testing-library/react";
import { renderHook } from "~test/kit/component";
import { expect, fn, suite, test } from "~test/kit";
import { PWA_VISITS_KEY, usePwaInstall } from "~/shared/hooks/usePwaInstall";

/** A stand-in for Chromium's beforeinstallprompt event with spied members. */
function makePromptEvent(outcome: "accepted" | "dismissed" = "accepted") {
  const event = new Event("beforeinstallprompt") as Event & {
    prompt: ReturnType<typeof fn>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
    preventDefault: ReturnType<typeof fn>;
  };
  event.prompt = fn(() => Promise.resolve());
  event.userChoice = Promise.resolve({ outcome });
  event.preventDefault = fn();
  return event;
}

/** Pretend the browser has already been visited `count` distinct sessions. */
function seedVisits(count: number) {
  localStorage.setItem(PWA_VISITS_KEY, String(count));
}

const firePrompt = (event: Event) => act(() => void window.dispatchEvent(event));

suite("usePwaInstall", () => {
  test("stays hidden on a first-ever visit even with a prompt in hand", async () => {
    const hook = renderHook(() => usePwaInstall());
    await firePrompt(makePromptEvent());
    expect(hook.current.canInstall).toBe(false);
  });

  test("offers the control to a returner once a prompt arrives", async () => {
    seedVisits(1); // this session bumps it to 2 → a returner
    const hook = renderHook(() => usePwaInstall());

    expect(hook.current.canInstall).toBe(false); // nothing until the event fires
    await firePrompt(makePromptEvent());
    expect(hook.current.canInstall).toBe(true);
  });

  test("suppresses the browser's own mini-infobar", async () => {
    seedVisits(1);
    renderHook(() => usePwaInstall());
    const event = makePromptEvent();
    await firePrompt(event);
    expect(event.preventDefault.calls.length).toBe(1);
  });

  test("prompts on demand and hides once the choice is made", async () => {
    seedVisits(1);
    const hook = renderHook(() => usePwaInstall());
    const event = makePromptEvent("dismissed");
    await firePrompt(event);

    await act(async () => {
      await hook.current.promptInstall();
    });

    expect(event.prompt.calls.length).toBe(1);
    expect(hook.current.canInstall).toBe(false); // single-use, whatever the outcome
  });

  test("hides for good once the app reports itself installed", async () => {
    seedVisits(1);
    const hook = renderHook(() => usePwaInstall());
    await firePrompt(makePromptEvent());
    expect(hook.current.canInstall).toBe(true);

    await act(() => void window.dispatchEvent(new Event("appinstalled")));
    expect(hook.current.canInstall).toBe(false);
  });
});
