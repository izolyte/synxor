import { initTRPC } from '@trpc/server';

// Single tRPC root for the whole app. Routers built from different initTRPC
// instances can't share context/middleware types once those are added, so
// every router and the app composition must import `t` from here.
export const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;
