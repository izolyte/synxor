import { phaseFor } from "~/features/room/utils/countdown";
import { EXPIRING_SOON_MS } from "~/features/room/constants/countdown";
import { expect, suite, test } from "~test/kit";

suite("phaseFor", () => {
  test("live well before expiry", () => {
    expect(phaseFor(EXPIRING_SOON_MS + 1000)).toBe("live");
  });

  test("expiring inside the urgent window", () => {
    expect(phaseFor(EXPIRING_SOON_MS)).toBe("expiring");
    expect(phaseFor(1000)).toBe("expiring");
  });

  test("expired at or past zero", () => {
    expect(phaseFor(0)).toBe("expired");
    expect(phaseFor(-1)).toBe("expired");
  });
});
