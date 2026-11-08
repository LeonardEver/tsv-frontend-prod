/**
 * CommunityGate (Phase 21 §9, restyled Phase 23) — Free users see the
 * Community entry point, but get a clear upgrade state instead of a
 * broken/404 page. The backend enforces access on every community route;
 * this gate is presentation only. Renders the Lovable LockedState.
 */
import { tr as uiText, useLocale as useInterfaceLocale } from "@/i18n";
import { LockedState } from "@/components/sa/primitives";
import { PageHeader } from "@/components/layout/AppShell";

export function CommunityGate() {
  useInterfaceLocale();
  return (
    <div>
      <PageHeader
        eyebrow={uiText("community:field_network_3a6b73")}
        title={uiText("community:community_bfd58e")}
        description={uiText("community:discuss_lessons_share_field_stories_and_ask_e2709f")}
      />
      <LockedState
        title={uiText("community:community_is_available_with_survivor_and_operator_e05706")}
        description={uiText("community:join_the_discussion_on_water_fire_shelter_9f9977")}
      />
    </div>
  );
}
