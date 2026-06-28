// Type-only public surface: clients infer their contract from AppRouter, with no
// server runtime in their bundle.
export type { AppRouter } from './trpc/trpc.service';
