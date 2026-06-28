// The tRPC-over-HTTP wire contract in one place: both backend adapters agree on
// the procedure path and response envelope, so neither pins a host/port and the
// shape can't drift. The client uses `httpBatchLink`, so responses are arrays
// (one entry per batched call); there is no superjson transformer, so `data` is
// raw. Update here if the client changes link or adds a transformer.

export const trpcProcedurePath = (procedure: string) => `/trpc/${procedure}`;

export const trpcOk = (data: unknown) => [{ result: { data } }];

export const trpcError = (error: { code: string; message?: string }) => [
  {
    error: {
      message: error.message ?? error.code,
      code: -32603,
      data: { code: error.code, httpStatus: 400 },
    },
  },
];
