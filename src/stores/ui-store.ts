/**
 * Minimal UI store (frontend spec §8.2): toast queue, offline flag and
 * the device theme preference. The ONLY sanctioned global client-state
 * store. Server data never enters this store.
 *
 * Theme is a DEVICE-scoped UI preference (O-4 light theme): the single
 * localStorage key "theme-pref" holds "dark"|"light" — no user data, no
 * cross-account state. Dark is the default identity; the light theme is
 * additive.
 */
import { create } from "zustand";

export interface Toast {
  id: number;
  tone: "info" | "success" | "error";
  title: string;
  description?: string;
}

export type Theme = "dark" | "light";

interface UiState {
  toasts: Toast[];
  offline: boolean;
  theme: Theme;
  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  setOffline: (offline: boolean) => void;
  toggleTheme: () => void;
}

let nextToastId = 1;

function readStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem("theme-pref");
    return stored === "light" || stored === "dark" ? stored : "dark";
  } catch {
    return "dark"; // storage unavailable → default identity
  }
}

function persistTheme(theme: Theme): void {
  try {
    window.localStorage.setItem("theme-pref", theme);
  } catch {
    // Storage failures never block the theme switch.
  }
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  offline: false,
  theme: typeof window === "undefined" ? "dark" : readStoredTheme(),
  pushToast: (toast) =>
    { set((state) => ({
      toasts: [...state.toasts, { ...toast, id: nextToastId++ }].slice(-4),
    })); },
  dismissToast: (id) =>
    { set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })); },
  setOffline: (offline) => { set({ offline }); },
  toggleTheme: () =>
    { set((state) => {
      const theme: Theme = state.theme === "dark" ? "light" : "dark";
      persistTheme(theme);
      return { theme };
    }); },
}));
