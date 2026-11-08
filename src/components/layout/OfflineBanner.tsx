/**
 * Offline banner (frontend spec §26): graceful degradation only —
 * no offline-first behavior in this phase.
 */
import { tr as uiText, useLocale as useInterfaceLocale } from "@/i18n";
import { WifiOff } from "lucide-react";
import { useUiStore } from "@/stores/ui-store";

export function OfflineBanner() {
  useInterfaceLocale();
  const offline = useUiStore((s) => s.offline);
  if (!offline) return null;

  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-warning-amber/15 px-4 py-1.5 text-sm text-warning-amber">
      <WifiOff aria-hidden="true" className="size-4" />{uiText("navigation:you_re_offline_showing_what_s_already_0d9ea4")}</div>
  );
}
