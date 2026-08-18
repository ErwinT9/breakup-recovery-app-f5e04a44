import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // `networkMode: "always"` is essential: React Query's default ("online")
  // PAUSES every query and mutation while the browser reports no connection,
  // which made the offline-first repositories unreachable — nothing could be
  // created or saved offline even though all writes are cached locally and
  // queued for sync.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { networkMode: "always", retry: 1 },
      mutations: { networkMode: "always", retry: 0 },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
