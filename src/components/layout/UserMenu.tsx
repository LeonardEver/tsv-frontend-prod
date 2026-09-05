/**
 * User menu (Phase 23) — Lovable topbar avatar (Avatar + display name)
 * as the trigger, opening the production dropdown with identity, profile
 * link, and sign out.
 */
import { useNavigate } from "react-router";
import { LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { Avatar } from "@/components/sa/primitives";
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/DropdownMenu";

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const fullName = user?.display_name || user?.email || "Survivor";
  const displayName = user?.display_name || user?.email || "";

  return (
    <DropdownMenu
      trigger={
        <button
          type="button"
          aria-label="Account menu"
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
        <UserRound aria-hidden="true" className="size-4" /> Profile
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={() => {
          void logout().then(() => navigate("/login", { replace: true }));
        }}
      >
        <LogOut aria-hidden="true" className="size-4" /> Sign out
      </DropdownMenuItem>
    </DropdownMenu>
  );
}
