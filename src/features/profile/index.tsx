/**
 * Profile & account (Phase 21 §1, restyled Phase 23). The Lovable
 * reference `src/routes/profile.tsx` supplies the visual structure —
 * identity hero, Section panels (Profile / Region & Language / Training
 * Preferences / Plan & Usage / Visibility / Session) — while every field
 * is the REAL backend-supported editor from the production
 * implementation (no fake editable fields, no decorative toggles).
 *
 * The page NEVER renders internal authorization concepts: no Role, no
 * internal ids, no provider details, no session identifiers. Email is
 * OIDC-authoritative and rendered read-only.
 */
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { clearServerCache } from "@/app/query-client";
import { queryKeys } from "@/lib/api/keys";
import { describeError } from "@/lib/api/error-map";
import { useUiStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Label } from "@/components/ui/Input";
import { ErrorState } from "@/components/shared/ErrorState";
import { Avatar, Chip, Eyebrow, ProgressBar, SectionHeader } from "@/components/sa/primitives";
import { PageHeader } from "@/components/layout/AppShell";
import { formatDate } from "@/lib/format/format";
import { fetchUsage, fetchSubscription } from "@/features/plans/plans.api";
import { BillingCard } from "@/features/billing/BillingCard";
import { fetchGamificationSummary } from "@/features/dashboard/dashboard.api";
import { fetchProfile, updateProfile, deleteAccount } from "./profile.api";
import type { ProfileResponse } from "@/lib/api/types";

export default function ProfilePage() {
  const { status, error, refresh, logout, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  const userId = user?.user_id ?? 0;

  const profileQuery = useQuery({
    queryKey: queryKeys.profile.current(userId),
    queryFn: fetchProfile,
    enabled: status === "authenticated" && userId > 0,
    staleTime: 30_000,
    retry: false,
  });

  const usageQuery = useQuery({
    queryKey: queryKeys.plans.usage(userId),
    queryFn: fetchUsage,
    enabled: status === "authenticated" && userId > 0,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const subscriptionQuery = useQuery({
    queryKey: queryKeys.plans.subscription(userId),
    queryFn: fetchSubscription,
    enabled: status === "authenticated" && userId > 0,
    staleTime: 30_000,
  });

  const gamificationQuery = useQuery({
    queryKey: queryKeys.gamification.summary,
    queryFn: fetchGamificationSummary,
    staleTime: 30_000,
    enabled: status === "authenticated",
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSettled: () => {
      clearServerCache(queryClient);
      void navigate("/login", { replace: true });
    },
    onError: () => {
      pushToast({
        tone: "error",
        title: "Couldn't delete your account",
        description: "Please try again.",
      });
    },
  });

  if (status === "loading" || profileQuery.isPending) {
    return (
      <div role="status" aria-label="Loading profile" className="space-y-6">
        <div className="panel h-40 animate-pulse" aria-hidden="true" />
        <div className="panel h-64 animate-pulse" aria-hidden="true" />
      </div>
    );
  }

  if (status === "error") {
    // Server unreachable — a retry screen, NOT a logout.
    return <ErrorState error={error} onRetry={refresh} />;
  }

  // unauthenticated never reaches here (RequireAuth), but stay explicit.
  if (status !== "authenticated") return null;

  if (profileQuery.isError) {
    return <ErrorState error={profileQuery.error} onRetry={() => void profileQuery.refetch()} />;
  }

  const profile = profileQuery.data;
  const summary = gamificationQuery.data;
  const usage = usageQuery.data;
  const subscription = subscriptionQuery.data;

  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Your identity, preferences and subscription inside the academy."
      />

      {/* Identity hero */}
      <section className="rise panel mb-10 grid gap-5 p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <Avatar name={profile.full_name || profile.display_name || profile.email || "Survivor"} size={84} />
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-semibold tracking-wide uppercase">
            {profile.full_name || profile.display_name || "Survivor"}
          </h2>
          {profile.username ? (
            <p className="mt-1 text-sm text-muted-foreground">@{profile.username}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip color="var(--ember)">{profile.plan_name} plan</Chip>
            {summary ? <Chip>Level {summary.level}</Chip> : null}
            {summary ? <Chip>{summary.level_title}</Chip> : null}
          </div>
          {profile.bio ? (
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">{profile.bio}</p>
          ) : null}
        </div>
      </section>

      <ProfileEditor
        profile={profile}
        onSaved={(saved) => {
          queryClient.setQueryData(queryKeys.profile.current(userId), saved);
          void queryClient.invalidateQueries({ queryKey: queryKeys.profile.current(userId) });
          pushToast({ tone: "success", title: "Profile saved" });
        }}
        onError={(err) => {
          const copy = describeError(err);
          pushToast({
            tone: "error",
            title: copy.title,
            description: copy.description,
          });
        }}
      />

      {/* ── SUBSCRIPTION / PLAN & USAGE ── */}
      <Section id="subscription" eyebrow="Subscription" title="Plan & Usage">
        {subscription && subscription.plan_code === "free" ? (
          <div className="space-y-3">
            <BillingCard subscription={subscription} />
            <Link
              to="/plans"
              className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90"
            >
              Upgrade plan
            </Link>
          </div>
        ) : subscription ? (
          <BillingCard subscription={subscription} />
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 p-4">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-10 place-items-center rounded-lg bg-primary/15 text-primary"
              >
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <p className="font-semibold">{profile.plan_name} plan</p>
                <p className="text-sm text-muted-foreground">
                  {profile.plan_code === "free"
                    ? "Your daily training ration"
                    : "Active subscription"}
                </p>
              </div>
            </div>
            <Link
              to="/plans"
              className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-accent"
            >
              {profile.plan_code === "free" ? "Upgrade" : "Manage plan"}
            </Link>
          </div>
        )}
        {usage ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-surface-2 p-4">
              <Eyebrow>Lessons today</Eyebrow>
              {usage.limits.daily_lessons === null ? (
                <p className="mt-1.5 font-display text-3xl leading-none">Unlimited</p>
              ) : (
                <>
                  <p className="mt-1.5 font-display text-3xl leading-none">
                    {usage.lesson_completions}{" "}
                    <span className="text-muted-foreground">/ {usage.limits.daily_lessons}</span>
                  </p>
                  <ProgressBar
                    className="mt-3"
                    value={(usage.limits.daily_lessons > 0 ? (usage.lesson_completions / usage.limits.daily_lessons) * 100 : 0)}
                    label="Lessons used today"
                  />
                </>
              )}
            </div>
            <div className="rounded-lg border border-border bg-surface-2 p-4">
              <Eyebrow>Field tests today</Eyebrow>
              {usage.limits.daily_quizzes === null ? (
                <p className="mt-1.5 font-display text-3xl leading-none">Unlimited</p>
              ) : (
                <>
                  <p className="mt-1.5 font-display text-3xl leading-none">
                    {usage.quiz_attempts}{" "}
                    <span className="text-muted-foreground">/ {usage.limits.daily_quizzes}</span>
                  </p>
                  <ProgressBar
                    className="mt-3"
                    value={(usage.limits.daily_quizzes > 0 ? (usage.quiz_attempts / usage.limits.daily_quizzes) * 100 : 0)}
                    color="var(--cat-water)"
                    label="Field tests used today"
                  />
                </>
              )}
            </div>
          </div>
        ) : null}
      </Section>

      {/* ── ACCOUNT / SESSION ── */}
      <Section id="account" eyebrow="Account" title="Session">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays aria-hidden="true" className="size-4" />
          Member since {formatDate(profile.member_since)}
        </p>
        <div className="mt-5 flex flex-wrap gap-3 border-t border-border pt-5">
          <button
            type="button"
            onClick={() => {
              logout().then(
                () => void navigate("/login", { replace: true }),
                () => void navigate("/login", { replace: true }),
              );
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-5 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-accent"
          >
            <LogOut className="size-4" /> Sign out
          </button>
          <DeleteAccountDialog
            pending={deleteMutation.isPending}
            onConfirm={() => { deleteMutation.mutate(); }}
          />
        </div>
      </Section>
    </div>
  );
}

/** Lovable Section wrapper (panel + SectionHeader). */
function Section({
  id,
  title,
  eyebrow,
  children,
}: {
  id: string;
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-10">
      <SectionHeader eyebrow={eyebrow} title={title} />
      <div className="panel p-5 sm:p-6">{children}</div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Editable profile form — PROFILE / PERSONAL / LEARNING / PRIVACY
// (production editor, restyled into Lovable Section panels)
// ═══════════════════════════════════════════════════════════════════════════

interface DraftState {
  username: string;
  full_name: string;
  bio: string;
  country: string;
  timezone: string;
  preferred_language: string;
  experience_level: string;
  reminder_preference: string;
  learning_goals: string;
  profile_visibility: string;
  avatar_visibility: string;
  community_display_name: string;
}

function toDraft(profile: ProfileResponse): DraftState {
  return {
    username: profile.username ?? "",
    full_name: profile.full_name ?? "",
    bio: profile.bio ?? "",
    country: profile.country ?? "",
    timezone: profile.timezone ?? "",
    preferred_language: profile.preferred_language,
    experience_level: profile.experience_level ?? "",
    reminder_preference: profile.reminder_preference,
    learning_goals: profile.learning_goals ?? "",
    profile_visibility: profile.profile_visibility,
    avatar_visibility: profile.avatar_visibility,
    community_display_name: profile.community_display_name ?? "",
  };
}

const emptyToNull = (v: string): string | null => (v.trim() === "" ? null : v.trim());

function ProfileEditor({
  profile,
  onSaved,
  onError,
}: {
  profile: ProfileResponse;
  onSaved: (saved: ProfileResponse) => void;
  onError: (err: unknown) => void;
}) {
  const [draft, setDraft] = useState<DraftState>(() => toDraft(profile));
  const [saveError, setSaveError] = useState<string | null>(null);

  // Server is the authority — resync the draft whenever the profile
  // changes (initial load, after save, after invalidation).
  useEffect(() => {
    setDraft(toDraft(profile));
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: (d: DraftState) =>
      updateProfile({
        username: emptyToNull(d.username),
        full_name: emptyToNull(d.full_name),
        bio: emptyToNull(d.bio),
        country: emptyToNull(d.country),
        timezone: emptyToNull(d.timezone),
        preferred_language: d.preferred_language,
        reminder_preference: d.reminder_preference as "daily" | "weekly" | "off",
        experience_level: (d.experience_level === "" ? null : d.experience_level) as
          | "beginner"
          | "intermediate"
          | "advanced"
          | null,
        learning_goals: emptyToNull(d.learning_goals),
        profile_visibility: d.profile_visibility as "community" | "private",
        avatar_visibility: d.avatar_visibility as "community" | "private",
        community_display_name: emptyToNull(d.community_display_name),
      }),
    onSuccess: (saved) => {
      setSaveError(null);
      onSaved(saved);
    },
    onError: (err) => {
      const copy = describeError(err);
      setSaveError(copy.title + (copy.description ? ` ${copy.description}` : ""));
      onError(err);
    },
  });

  const set = (key: keyof DraftState) => (value: string) =>
    { setDraft((d) => ({ ...d, [key]: value })); };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        saveMutation.mutate(draft);
      }}
    >
      <Section id="profile" eyebrow="Identity" title="Profile">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pf-full-name">Full name</Label>
            <Input
              id="pf-full-name"
              value={draft.full_name}
              onChange={(e) => { set("full_name")(e.target.value); }}
              placeholder="Your name in the field"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-username">Username</Label>
            <Input
              id="pf-username"
              value={draft.username}
              onChange={(e) => { set("username")(e.target.value); }}
              placeholder="lowercase-handle-123"
              maxLength={30}
            />
            <p className="text-xs text-text-secondary">
              Lowercase letters, digits, - and _ (3–30 characters). The
              backend validates this format.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-email">Account email</Label>
            <Input id="pf-email" value={profile.email} readOnly disabled />
            <p className="text-xs text-text-secondary">
              Verified at sign-in — account emails can&apos;t be changed here.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-bio">Bio</Label>
            <Input
              id="pf-bio"
              value={draft.bio}
              onChange={(e) => { set("bio")(e.target.value); }}
              placeholder="A line about you and your preparedness journey"
              maxLength={300}
            />
          </div>
        </div>
      </Section>

      <Section id="personal" eyebrow="Personal" title="Region & Language">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="pf-country">Country</Label>
            <Input
              id="pf-country"
              value={draft.country}
              onChange={(e) => { set("country")(e.target.value); }}
              placeholder="Brazil"
              maxLength={100}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-timezone">Timezone</Label>
            <Input
              id="pf-timezone"
              value={draft.timezone}
              onChange={(e) => { set("timezone")(e.target.value); }}
              placeholder="America/Sao_Paulo"
              maxLength={64}
            />
            <p className="text-xs text-text-secondary">
              Daily limits reset on your timezone (UTC when unset).
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-language">Preferred language</Label>
            <select
              id="pf-language"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
              value={draft.preferred_language}
              onChange={(e) => { set("preferred_language")(e.target.value); }}
            >
              <option value="en">English</option>
              <option value="pt-BR">Português (Brasil)</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>
      </Section>

      <Section id="learning" eyebrow="Learning" title="Training Preferences">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pf-experience">Experience level</Label>
            <select
              id="pf-experience"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
              value={draft.experience_level}
              onChange={(e) => { set("experience_level")(e.target.value); }}
            >
              <option value="">Prefer not to say</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-reminder">Learning reminder</Label>
            <select
              id="pf-reminder"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
              value={draft.reminder_preference}
              onChange={(e) => { set("reminder_preference")(e.target.value); }}
            >
              <option value="off">No reminders</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pf-goals">Learning goals (optional)</Label>
            <Input
              id="pf-goals"
              value={draft.learning_goals}
              onChange={(e) => { set("learning_goals")(e.target.value); }}
              placeholder="What do you want to be ready for?"
              maxLength={300}
            />
          </div>
        </div>
      </Section>

      <Section id="privacy" eyebrow="Privacy" title="Visibility">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pf-visibility">Profile visibility</Label>
            <select
              id="pf-visibility"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
              value={draft.profile_visibility}
              onChange={(e) => { set("profile_visibility")(e.target.value); }}
            >
              <option value="community">Community profile</option>
              <option value="private">Private</option>
            </select>
            <p className="text-xs text-text-secondary">
              Private profiles hide your bio from other members.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-avatar">Avatar visibility</Label>
            <select
              id="pf-avatar"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
              value={draft.avatar_visibility}
              onChange={(e) => { set("avatar_visibility")(e.target.value); }}
            >
              <option value="community">Show avatar</option>
              <option value="private">Hide avatar</option>
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pf-community-name">Community display name</Label>
            <Input
              id="pf-community-name"
              value={draft.community_display_name}
              onChange={(e) => { set("community_display_name")(e.target.value); }}
              placeholder="How other members see you (defaults to your name)"
              maxLength={60}
            />
          </div>
        </div>
      </Section>

      {saveError ? (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4" role="alert">
          <p className="text-sm text-destructive">{saveError}</p>
        </div>
      ) : null}

      <div className="mb-10 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="glow-ember inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {saveMutation.isPending ? "Saving…" : "Save profile"}
        </button>
        <button
          type="button"
          disabled={saveMutation.isPending}
          onClick={() => { setDraft(toDraft(profile)); }}
          className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-accent disabled:opacity-60"
        >
          Reset
        </button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

function DeleteAccountDialog({
  pending,
  onConfirm,
}: {
  pending: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" onClick={() => { setOpen(true); }}>
        <Trash2 aria-hidden="true" className="size-4" />
        Delete account
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Delete your account?"
        description="This permanently deletes your account, progress, XP and community content. This cannot be undone."
      >
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={() => { setOpen(false); }} disabled={pending}>
            Keep account
          </Button>
          <Button variant="danger" loading={pending} onClick={onConfirm}>
            Delete permanently
          </Button>
        </div>
      </Dialog>
    </>
  );
}
