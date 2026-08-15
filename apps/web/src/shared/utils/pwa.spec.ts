import { afterEach, expect, suite, test } from "~test/kit";
import { isIos, isRunningStandalone } from "~/shared/utils/pwa";

/** Override a navigator getter for one test; `restore` puts jsdom's own back. */
function stubNavigator(prop: string, value: unknown) {
  Object.defineProperty(navigator, prop, { value, configurable: true });
}

suite("pwa detection", () => {
  afterEach(() => {
    for (const prop of ["userAgent", "platform", "maxTouchPoints", "standalone"]) {
      // @ts-expect-error — drop the per-test stub so the prototype getter returns.
      delete navigator[prop];
    }
    // @ts-expect-error — remove the matchMedia stub; jsdom ships none.
    delete window.matchMedia;
  });

  suite("isIos", () => {
    test("matches an iPhone user agent", () => {
      stubNavigator("userAgent", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
      expect(isIos()).toBe(true);
    });

    test("matches iPadOS masquerading as desktop Safari", () => {
      stubNavigator("userAgent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)");
      stubNavigator("platform", "MacIntel");
      stubNavigator("maxTouchPoints", 5);
      expect(isIos()).toBe(true);
    });

    test("is false on a desktop", () => {
      stubNavigator("userAgent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
      stubNavigator("platform", "Win32");
      stubNavigator("maxTouchPoints", 0);
      expect(isIos()).toBe(false);
    });
  });

  suite("isRunningStandalone", () => {
    test("is true when display-mode is standalone", () => {
      window.matchMedia = ((query: string) => ({ matches: query.includes("standalone") })) as never;
      expect(isRunningStandalone()).toBe(true);
    });

    test("is true for an iOS home-screen launch", () => {
      stubNavigator("standalone", true);
      expect(isRunningStandalone()).toBe(true);
    });

    test("is false in a normal browser tab", () => {
      expect(isRunningStandalone()).toBe(false);
    });
  });
});
