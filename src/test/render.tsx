/**
 * Test render helpers: fresh QueryClient per test (no cross-test cache
 * leakage) + optional router.
 */
import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(ui: ReactElement) {
  const queryClient = createTestQueryClient();
  const result = render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
  return { ...result, queryClient };
}

export function renderAtRoute(
  ui: ReactElement,
  route: string,
  /** Route pattern with dynamic segments (default: catch-all). Pass the
   * real pattern when the component under test reads useParams(). */
  pattern: string = "*",
) {
  const router = createMemoryRouter([{ path: pattern, element: ui }], {
    initialEntries: [route],
  });
  const queryClient = createTestQueryClient();
  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...result, router, queryClient };
}
