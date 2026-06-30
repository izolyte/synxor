/** Resolves after `ms` — a Promise-friendly sleep. */
export const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
