/**
 * CommunityGate (Phase 21 §9, restyled Phase 23) — Free users see the
 * Community entry point, but get a clear upgrade state instead of a
 * broken/404 page. The backend enforces access on every community route;
 * this gate is presentation only. Renders the Lovable LockedState.
 */
import { LockedState } from "@/components/sa/primitives";
import { PageHeader } from "@/components/layout/AppShell";

export function CommunityGate() {
  return (
    <div>
      <PageHeader
        eyebrow="Field network"
        title="Community"
        description="Discuss lessons, share field stories and ask questions with other Survival Academy members."
      />
      <LockedState
        title="Community is available with Survivor and Operator"
        description="Join the discussion on water, fire, shelter, food and more — with the members who train every day."
      />
    </div>
  );
}
