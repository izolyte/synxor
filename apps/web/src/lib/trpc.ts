import type { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy, type TRPCOptionsProxy } from "@trpc/tanstack-react-query";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "api";

// Backend contract types, inferred from AppRouter — no hand-written DTOs.
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

// Router context: loaders and components read the typed proxy and QueryClient here.
export interface RouterAppContext {
  trpc: TRPCOptionsProxy<AppRouter>;
  queryClient: QueryClient;
}

// api is a separate host, so the URL must be absolute (also required for SSR).
// Set VITE_API_URL outside local dev.
function trpcUrl() {
  const base = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  return `${base}/trpc`;
}

function createTrpcClient() {
  return createTRPCClient<AppRouter>({
    links: [httpBatchLink({ url: trpcUrl() })],
  });
}

// Typed proxy for loaders and components; the only module that imports AppRouter.
export function createTrpcProxy(queryClient: QueryClient): TRPCOptionsProxy<AppRouter> {
  return createTRPCOptionsProxy<AppRouter>({
    client: createTrpcClient(),
    queryClient,
  });
}
