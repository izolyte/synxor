export type CountdownPhase = "live" | "expiring" | "expired";

export interface Countdown {
  /** Whole-unit label, e.g. "2d 3h", "1h 23m", "4m 07s". */
  label: string;
  phase: CountdownPhase;
}
