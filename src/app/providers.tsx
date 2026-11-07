/**
 * Provider stack: Query → Auth → Router.
 */
import type { ReactNode } from "react";
import { RouterProvider } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./query-client";
import { AuthProvider } from "@/features/auth/use-auth";
import { router } from "./router";
import { AppErrorBoundary } from "./error-boundary";
import { ThemeSync } from "@/components/layout/ThemeSync";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeSync />
          {children}
        </AuthProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
