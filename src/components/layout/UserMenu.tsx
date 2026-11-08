/**
 * User menu (Phase 23) — Lovable topbar avatar (Avatar + display name)
 * as the trigger, opening the production dropdown with identity, profile
 * link, and sign out.
 */
import { tr as uiText, useLocale as useInterfaceLocale } from "@/i18n";
import { useNavigate } from "react-router";
import { LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Avatar } from "@/components/sa/primitives";
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/DropdownMenu";

export function UserMenu() {
  useInterfaceLocale();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const fullName = user?.display_name || user?.email || "Survivor";
  const displayName = user?.display_name || user?.email || "";

  return (
    <DropdownMenu
      trigger={
        <button
          type="button"
          data-shell-account
          aria-label={uiText("navigation:account_menu_60f5a3")}
          className="flex items-center gap-2 rounded-lg p-1"
        >
          <Avatar name={fullName} size={32} />
          <span className="hidden text-sm sm:inline">{displayName}</span>
        </button>
      }
    >
      <div className="px-3 py-2">
        <p className="text-sm font-semibold">{user?.display_name || user?.email}</p>
        {user?.display_name && user.email ? (
          <p className="text-xs text-text-secondary">{user.email}</p>
        ) : null}
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => void navigate("/profile")}>
        <UserRound aria-hidden="true" className="size-4" />{" "}{uiText("navigation:profile_ff4fc0")}</DropdownMenuItem>
      <DropdownMenuItem
        onSelect={() => {
          void logout().then(() => navigate("/login", { replace: true }));
        }}
      >
        <LogOut aria-hidden="true" className="size-4" />{" "}{uiText("navigation:sign_out_dc1649")}</DropdownMenuItem>
    </DropdownMenu>
  );
}
