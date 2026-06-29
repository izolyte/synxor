import { TRPCClientError } from "@trpc/client";
import { classifyJoinError } from "~/features/room/utils/join-error";
import { expect, suite, test } from "~test/kit";

// A TRPCClientError instance carrying a server error code, shaped like the real
// wire response the classifier reads (`error.data.code`). Named to not collide with
// the kit's `trpcError`, which builds an error *response body* for the mock backend.
function trpcClientError(code: string) {
  return new TRPCClientError("rejected", {
    result: { error: { data: { code } } },
  } as unknown as ConstructorParameters<typeof TRPCClientError>[1]);
}

suite("classifyJoinError", () => {
  test("server-refused codes are 'rejected'", () => {
    expect(classifyJoinError(trpcClientError("NOT_FOUND"))).toBe("rejected");
    expect(classifyJoinError(trpcClientError("BAD_REQUEST"))).toBe("rejected");
  });

  test("a server fault is retryable 'network'", () => {
    expect(classifyJoinError(trpcClientError("INTERNAL_SERVER_ERROR"))).toBe("network");
  });

  test("non-tRPC failures are 'network'", () => {
    expect(classifyJoinError(new Error("boom"))).toBe("network");
    expect(classifyJoinError(null)).toBe("network");
  });
});
