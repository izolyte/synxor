import { buildUrl } from "~/shared/utils/url";
import { expect, suite, test } from "~test/kit";

suite("buildUrl", () => {
  test("prefixes the current origin", () => {
    expect(buildUrl("/join")).toBe(`${window.location.origin}/join`);
  });

  test("appends and encodes query params", () => {
    expect(buildUrl("/join", { code: "ABC123" })).toBe(
      `${window.location.origin}/join?code=ABC123`,
    );
    expect(buildUrl("/join", { code: "A B" })).toBe(`${window.location.origin}/join?code=A%20B`);
  });

  test("joins multiple params with &", () => {
    expect(buildUrl("/x", { a: "1", b: "2" })).toBe(`${window.location.origin}/x?a=1&b=2`);
  });
});
