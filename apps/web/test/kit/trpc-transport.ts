// The tRPC-over-HTTP wire contract in one place: both backend adapters agree on
// the procedure path and response envelope, so neither pins a host/port and the
// shape can't drift. Update here if the client adds batching or superjson.

export const trpcProcedurePath = (procedure: string) => `/trpc/${procedure}`;

export const trpcOk = (data: unknown) => ({ result: { data } });

export const trpcError = (error: { code: string; message?: string }) => ({
  error: { code: error.code, message: error.message },
});
