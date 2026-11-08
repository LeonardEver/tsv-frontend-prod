import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { CurrentUser } from "@/lib/api/types";
import { queryKeys } from "@/lib/api/keys";
import { updateProfile } from "@/features/profile/profile.api";
import { useUiStore } from "@/stores/ui-store";
import { changeLocale, explicitLocale, getLocale, tr } from "./index";
import { normalizeLocale } from "./config";

/** Hold the authenticated shell until a confirmed account locale is ready.
 * Account IDs and sync state stay in memory, never in language storage. */
export function useAccountLocale(user: CurrentUser | undefined): boolean {
  const client = useQueryClient();
  const [ready, setReady] = useState<string | null>(null);
  const [bootstrappedUser, setBootstrappedUser] = useState<number | null>(null);
  const signature = user?.preferred_language === undefined ? null
    : `${user.user_id}:${user.preferred_language}:${user.language_confirmed_at ?? ""}`;
  useEffect(() => {
    if (!user) {
      setBootstrappedUser(null);
      setReady(null);
      return;
    }
    if (signature === null) return;
    const controller = new AbortController();
    const stillActive = () => !controller.signal.aborted;
    const accountLocale = user.language_confirmed_at ? normalizeLocale(user.preferred_language) : null;
    const localChoice = explicitLocale();
    const selected = accountLocale ?? localChoice ?? getLocale();
    void (async () => {
      try {
        await changeLocale(selected, { explicit: accountLocale !== null || localChoice !== null });
        if (!stillActive()) return;
        if (!user.language_confirmed_at && localChoice !== null) {
          await updateProfile({ preferred_language: localChoice });
          if (!stillActive()) return;
          // Read the confirmation timestamp back from the account API.
          void client.invalidateQueries({ queryKey: queryKeys.auth.me });
        }
      } catch {
        if (stillActive()) useUiStore.getState().pushToast({ tone: "error", title: tr("languageSaveFailed") });
      } finally {
        if (stillActive()) {
          setReady(signature);
          setBootstrappedUser(user.user_id);
        }
      }
    })();
    return () => { controller.abort(); };
  }, [user, signature, client]);
  // Later changes update in place: never remount an active lesson or form.
  return signature === null || ready === signature || bootstrappedUser === user?.user_id;
}
