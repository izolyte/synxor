// MSW-backed implementation of the backend seam for Vitest. The interface is
// fixed (test/kit/types.ts) and the tRPC wire shape lives in trpc-transport.
// Host-agnostic match (`*…`) so no port is pinned here.

import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import type { BackendMock, Stub } from "../../types";
import { trpcError, trpcHttpStatus, trpcOk, trpcProcedurePath } from "../../trpc-transport";

export const server = setupServer();

function makeStub(procedure: string): Stub {
  const route = `*${trpcProcedurePath(procedure)}`;
  return {
    async resolves(output) {
      // tRPC mutations ride POST, queries ride GET — register both so a stub
      // covers a procedure without the caller knowing its verb (the Playwright
      // adapter's page.route already matches any method).
      const handler = () => HttpResponse.json(trpcOk(output));
      server.use(http.post(route, handler), http.get(route, handler));
    },
    async rejects(error) {
      const handler = () =>
        HttpResponse.json(trpcError(error), { status: trpcHttpStatus(error.code) });
      server.use(http.post(route, handler), http.get(route, handler));
    },
  };
}

export function createBackend(): BackendMock {
  return {
    rpc: (procedure) => makeStub(procedure),
  };
}
