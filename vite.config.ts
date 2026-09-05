import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import visualizerPkg from "rollup-plugin-visualizer";

const { visualizer } = visualizerPkg;

/**
 * Vite configuration — Survival Academy frontend.
 *
 * - Dev proxy: /api → http://localhost:3000 (same-origin in dev, matching
 *   the production Nginx topology and the session cookie's Path=/api).
 * - Build-time environment guards (frontend spec §28): a non-production
 *   build must never point at the production API, and a production build
 *   must never point at a non-HTTPS API (the backend only sets the Secure
 *   cookie when APP_BASE_URL is https).
 * - Manual vendor chunking keeps the foundation lean and the markdown
 *   renderer isolated for future lazy loading (spec §19).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBase = env.VITE_API_BASE_URL ?? "";

  if (mode !== "production" && /\bsurvivalacademy\.com\b/.test(apiBase)) {
    throw new Error(
      `Build guard: ${mode} build must not target the production API (VITE_API_BASE_URL="${apiBase}").`,
    );
  }
  if (mode === "production" && apiBase && !apiBase.startsWith("https://")) {
    throw new Error(
      `Build guard: production build requires an HTTPS API base (VITE_API_BASE_URL="${apiBase}") or same-origin (empty).`,
    );
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(mode === "analyze"
        ? [visualizer({ open: false, gzipSize: true, filename: "dist/stats.html" })]
        : []),
    ],
    resolve: {
      alias: {
        // fileURLToPath: correct on Windows (URL.pathname keeps a leading
        // slash that breaks path resolution).
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: env.VITE_DEV_PROXY_TARGET ?? "http://localhost:3000",
          changeOrigin: false,
        },
      },
    },
    build: {
      sourcemap: mode === "production" ? false : true,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom"],
            router: ["react-router"],
            query: ["@tanstack/react-query"],
            markdown: ["react-markdown", "remark-gfm"],
          },
        },
      },
    },
    test: {
      // jsdom + Node-native AbortController/AbortSignal (see
      // src/test/jsdom-node-abort-environment.ts — Node 24 undici rejects
      // jsdom-realm signals on navigation Requests).
      environment: "./src/test/jsdom-node-abort-environment.ts",
      globals: false,
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      restoreMocks: true,
    },
  };
});
