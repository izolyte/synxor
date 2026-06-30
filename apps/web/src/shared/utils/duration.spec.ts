import { formatDuration } from "~/shared/utils/duration";
import { DAY, HOUR, MINUTE, SECOND } from "~/shared/constants/time";
import { expect, suite, test } from "~test/kit";

suite("formatDuration", () => {
  test("days and hours beyond a day", () => {
    expect(formatDuration(2 * DAY + 3 * HOUR + 40 * MINUTE)).toBe("2d 3h");
  });

  test("hours and minutes within a day", () => {
    expect(formatDuration(HOUR + 23 * MINUTE + 40 * SECOND)).toBe("1h 23m");
  });

  test("minutes and zero-padded seconds within the last hour", () => {
    expect(formatDuration(4 * MINUTE + 7 * SECOND)).toBe("4m 07s");
  });

  test("clamps zero and negatives", () => {
    expect(formatDuration(0)).toBe("0m 00s");
    expect(formatDuration(-SECOND)).toBe("0m 00s");
  });
});
