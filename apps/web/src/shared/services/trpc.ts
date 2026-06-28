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
// Set VITE_API_URL outside local dev. Pure + env passed in, so it's unit-testable
// without constructing the client.
export function resolveTrpcUrl(env: { VITE_API_URL?: string; DEV: boolean }): string {
  const base = env.VITE_API_URL;
  if (!base) {
    if (env.DEV) {
      return "http://localhost:3000/trpc";
    }
    throw new Error("VITE_API_URL must be set outside local development");
  }
  // Accept either a bare API origin or one that already ends in /trpc, so a
  // misconfigured env can't produce /trpc/trpc.
  const trimmed = base.replace(/\/+$/, "");
  return trimmed.endsWith("/trpc") ? trimmed : `${trimmed}/trpc`;
}

function createTrpcClient() {
  return createTRPCClient<AppRouter>({
    links: [httpBatchLink({ url: resolveTrpcUrl(import.meta.env) })],
  });
}

// Typed proxy for loaders and components; the only module that imports AppRouter.
export function createTrpcProxy(queryClient: QueryClient): TRPCOptionsProxy<AppRouter> {
  return createTRPCOptionsProxy<AppRouter>({
    client: createTrpcClient(),
    queryClient,
  });
}
