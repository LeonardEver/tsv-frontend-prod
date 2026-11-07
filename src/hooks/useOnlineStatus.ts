/**
 * Network status hook (frontend spec §26 — graceful degradation, no
 * offline-first yet). Mirrors into the UI store so the OfflineBanner
 * and error UX read one source.
 */
import { useEffect } from "react";
import { useUiStore } from "@/stores/ui-store";

export function useOnlineStatus(): boolean {
  const offline = useUiStore((s) => s.offline);
  const setOffline = useUiStore((s) => s.setOffline);

  useEffect(() => {
    const update = () => { setOffline(!navigator.onLine); };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [setOffline]);

  return !offline;
}
