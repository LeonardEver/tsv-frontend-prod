/**
 * Custom Vitest environment: jsdom + Node-native AbortController/AbortSignal.
 *
 * The stock jsdom environment overwrites globalThis.AbortController and
 * AbortSignal with jsdom's own implementations. Node 24's fetch (undici)
 * strictly rejects foreign-realm signals — react-router builds
 * `new Request(..., { signal })` on every navigation, MSW re-wraps the
 * request, and every <Navigate> threw in CI (Node 22 locally is lenient).
 *
 * This environment captures Node's native classes BEFORE jsdom populates
 * the global and restores them afterwards, so every signal in the test
 * realm (jsdom DOM code included) is the class undici accepts.
 */
import { builtinEnvironments } from "vitest/environments";

export default {
  name: "jsdom-node-abort",
  transformMode: "web",
  async setup(global: Record<string, unknown>, options: Record<string, unknown>) {
    const nativeAbortController = global.AbortController;
    const nativeAbortSignal = global.AbortSignal;

    const env = await builtinEnvironments.jsdom.setup(global, options);

    Object.defineProperties(global, {
      AbortController: { value: nativeAbortController, writable: true, configurable: true },
      AbortSignal: { value: nativeAbortSignal, writable: true, configurable: true },
    });

    return env;
  },
};
