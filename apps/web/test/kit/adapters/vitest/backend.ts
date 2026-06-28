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
      server.use(http.post(route, () => HttpResponse.json(trpcOk(output))));
    },
    async rejects(error) {
      server.use(
        http.post(route, () =>
          HttpResponse.json(trpcError(error), { status: trpcHttpStatus(error.code) }),
        ),
      );
    },
  };
}

export function createBackend(): BackendMock {
  return {
    rpc: (procedure) => makeStub(procedure),
  };
}
