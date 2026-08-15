import { renderComponent } from "~test/kit/component";
import { afterEach, expect, suite, test } from "~test/kit";
import { IOS_HINT_DISMISSED_KEY, IosInstallHint } from "~/shared/components/IosInstallHint";

const IPHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari";

function stubUserAgent(value: string) {
  Object.defineProperty(navigator, "userAgent", { value, configurable: true });
}

suite("IosInstallHint", () => {
  afterEach(() => {
    // @ts-expect-error — drop the per-test UA stub so jsdom's default returns.
    delete navigator.userAgent;
  });

  test("stays absent off iOS", async () => {
    stubUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    const screen = renderComponent(<IosInstallHint />);
    await screen.find({ role: "region" }).shouldNotExist();
  });

  test("nudges iOS visitors toward Add to Home Screen", async () => {
    stubUserAgent(IPHONE_UA);
    const screen = renderComponent(<IosInstallHint />);
    await screen.find({ role: "region", name: "Install synxor" }).shouldHaveText("Add to Home Screen");
  });

  test("dismisses once and never returns", async () => {
    stubUserAgent(IPHONE_UA);

    const first = renderComponent(<IosInstallHint />);
    await first.find({ role: "button", name: "Dismiss" }).click();
    await first.find({ role: "region" }).shouldNotExist();
    expect(localStorage.getItem(IOS_HINT_DISMISSED_KEY)).toBe("1");

    // A later mount (fresh visit) honours the stored dismissal.
    const second = renderComponent(<IosInstallHint />);
    await second.find({ role: "region" }).shouldNotExist();
  });
});
