import { renderComponent } from "~test/kit/component";
import { afterEach, expect, suite, test } from "~test/kit";
import { ThemeToggle } from "~/shared/components/ThemeToggle";

const isDark = () => document.documentElement.classList.contains("dark");

suite("ThemeToggle", () => {
  // The class lives on <html>, outside the render root, so reset it between tests
  // (afterEach in the kit's setup already clears localStorage).
  afterEach(() => document.documentElement.classList.remove("dark"));

  test("flips the theme and persists the choice", async () => {
    const screen = renderComponent(<ThemeToggle />);

    await screen.find({ role: "button", name: "Switch to dark theme" }).click();
    expect(isDark()).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");

    await screen.find({ role: "button", name: "Switch to light theme" }).click();
    expect(isDark()).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });

  test("labels the action for the current theme", async () => {
    document.documentElement.classList.add("dark");
    const screen = renderComponent(<ThemeToggle />);

    // Seeded from the .dark class after mount, so the label offers the way back.
    await screen.find({ role: "button", name: "Switch to light theme" }).shouldBeVisible();
  });
});
