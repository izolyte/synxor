import { phaseFor, warnThresholdMs } from "~/features/room/utils/countdown";
import {
  EXPIRY_WARN_FRACTION,
  MAX_EXPIRY_WARN_MS,
  MIN_EXPIRY_WARN_MS,
} from "~/features/room/constants/countdown";
import { DAY, HOUR, MINUTE } from "~/shared/constants/time";
import { expect, suite, test } from "~test/kit";

suite("warnThresholdMs", () => {
  test("scales to a fraction of the lifespan for the real Expiry options", () => {
    // 1h/24h/7d all land inside the clamp band, so the warning is purely proportional.
    expect(warnThresholdMs(HOUR)).toBe(EXPIRY_WARN_FRACTION * HOUR);
    expect(warnThresholdMs(24 * HOUR)).toBe(EXPIRY_WARN_FRACTION * (24 * HOUR));
    expect(warnThresholdMs(7 * DAY)).toBe(EXPIRY_WARN_FRACTION * (7 * DAY));
  });

  test("clamps a pathologically short or long lifespan to the band", () => {
    // A tiny Room would warn for a blink; a month-long one would sit amber for days.
    expect(warnThresholdMs(10 * MINUTE)).toBe(MIN_EXPIRY_WARN_MS);
    expect(warnThresholdMs(30 * DAY)).toBe(MAX_EXPIRY_WARN_MS);
  });

  test("falls back to the floor when the lifespan is unknown", () => {
    expect(warnThresholdMs(null)).toBe(MIN_EXPIRY_WARN_MS);
    expect(warnThresholdMs(0)).toBe(MIN_EXPIRY_WARN_MS);
  });
});

suite("phaseFor", () => {
  test("warns proportionately later for a short Room than a long one", () => {
    // Same 10 minutes remaining: an eternity for a 1-hour Room (warns at 6m), but
    // already inside a 7-day Room's window (warns ~16.8h out).
    expect(phaseFor(10 * MINUTE, HOUR)).toBe("live");
    expect(phaseFor(10 * MINUTE, 7 * DAY)).toBe("expiring");
  });

  test("toggles right at the scaled threshold", () => {
    const shortRoom = HOUR;
    expect(phaseFor(warnThresholdMs(shortRoom) + 1000, shortRoom)).toBe("live");
    expect(phaseFor(warnThresholdMs(shortRoom), shortRoom)).toBe("expiring");

    const longRoom = 7 * DAY;
    expect(phaseFor(warnThresholdMs(longRoom) + 1000, longRoom)).toBe("live");
    expect(phaseFor(warnThresholdMs(longRoom), longRoom)).toBe("expiring");
  });

  test("uses the fixed floor window when the lifespan is unknown", () => {
    expect(phaseFor(MIN_EXPIRY_WARN_MS + 1000, null)).toBe("live");
    expect(phaseFor(MIN_EXPIRY_WARN_MS, null)).toBe("expiring");
  });

  test("expired at or past zero, whatever the lifespan", () => {
    expect(phaseFor(0, HOUR)).toBe("expired");
    expect(phaseFor(-1, null)).toBe("expired");
  });
});
