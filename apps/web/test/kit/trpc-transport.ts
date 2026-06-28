// The tRPC-over-HTTP wire contract in one place: both backend adapters agree on
// the procedure path and response envelope, so neither pins a host/port and the
// shape can't drift. The client uses `httpBatchLink`, so responses are arrays
// (one entry per batched call); there is no superjson transformer, so `data` is
// raw. Update here if the client changes link or adds a transformer.

export const trpcProcedurePath = (procedure: string) => `/trpc/${procedure}`;

export const trpcOk = (data: unknown) => [{ result: { data } }];

// tRPC error code → HTTP status / JSON-RPC code, mirroring the server so mocked
// failures match production status handling. Unknown codes fall back to internal.
const HTTP_STATUS_BY_CODE: Record<string, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TIMEOUT: 408,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNPROCESSABLE_CONTENT: 422,
  TOO_MANY_REQUESTS: 429,
  CLIENT_CLOSED_REQUEST: 499,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

const JSONRPC_CODE_BY_CODE: Record<string, number> = {
  PARSE_ERROR: -32700,
  BAD_REQUEST: -32600,
  INTERNAL_SERVER_ERROR: -32603,
  UNAUTHORIZED: -32001,
  FORBIDDEN: -32003,
  NOT_FOUND: -32004,
};

export const trpcHttpStatus = (code: string): number => HTTP_STATUS_BY_CODE[code] ?? 500;

export const trpcError = (error: { code: string; message?: string }) => [
  {
    error: {
      message: error.message ?? error.code,
      code: JSONRPC_CODE_BY_CODE[error.code] ?? -32603,
      data: { code: error.code, httpStatus: trpcHttpStatus(error.code) },
    },
  },
];
