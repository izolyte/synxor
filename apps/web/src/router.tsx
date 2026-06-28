import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { createTrpcProxy } from "~/lib/trpc";
import { routeTree } from "./routeTree.gen";

/**
 * Creates the application router with the tRPC + TanStack Query integration.
 *
 * @returns The configured TanStack Router instance.
 */
export function createRouter() {
  const queryClient = new QueryClient({
    // SSR: non-zero staleTime avoids an immediate refetch on hydrate.
    defaultOptions: { queries: { staleTime: 60 * 1000 } },
  });

  const trpc = createTrpcProxy(queryClient);

  const router = createTanStackRouter({
    routeTree,
    context: { trpc, queryClient },
    defaultPreload: "intent",
    scrollRestoration: true,
  });

  // Dehydrates loader queries to the client and mounts the QueryClientProvider.
  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

export const getRouter = createRouter;

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
