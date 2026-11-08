import { useCallback, useSyncExternalStore } from "react";

export type ExperienceMode = "pro" | "simplified";

const STORAGE_KEY = "survival-academy-experience";
const EVENT_NAME = "survival-academy-experience-change";

export function readExperienceMode(): ExperienceMode {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "simplified" ? "simplified" : "pro";
  } catch {
    return "pro";
  }
}

export function writeExperienceMode(mode: ExperienceMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // A blocked device preference must never block navigation.
  }
  window.dispatchEvent(new Event(EVENT_NAME));
}

function subscribe(listener: () => void): () => void {
  window.addEventListener(EVENT_NAME, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT_NAME, listener);
    window.removeEventListener("storage", listener);
  };
}

export function useExperienceMode(): [ExperienceMode, (mode: ExperienceMode) => void] {
  // Explicit type argument: without it TS widens the server snapshot
  // (`() => "pro"`) to `string` and `mode` stops being assignable to
  // ExperienceMode.
  const mode = useSyncExternalStore<ExperienceMode>(subscribe, readExperienceMode, () => "pro");
  const setMode = useCallback((next: ExperienceMode) => { writeExperienceMode(next); }, []);
  return [mode, setMode];
}