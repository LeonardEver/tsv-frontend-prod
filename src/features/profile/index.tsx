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
import { tr as uiText, useLocale as useInterfaceLocale, uiValue } from "@/i18n";
import { rankTitle } from "@/features/gamification/rewards-presenter";
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
import { CountrySelect } from "@/components/ui/CountrySelect";
import { ErrorState } from "@/components/shared/ErrorState";
import { Avatar, Chip, Eyebrow, ProgressBar, SectionHeader } from "@/components/sa/primitives";
import { PageHeader } from "@/components/layout/AppShell";
import { formatDate } from "@/lib/format/format";
import { fetchUsage, fetchSubscription } from "@/features/plans/plans.api";
import { BillingCard } from "@/features/billing/BillingCard";
import { fetchGamificationSummary } from "@/features/dashboard/dashboard.api";
import { fetchProfile, updateProfile, deleteAccount } from "./profile.api";
import type { ProfileResponse } from "@/lib/api/types";
import { LanguageSelector } from "@/i18n/LanguageSelector";
import { changeLocale, useLocale, useT } from "@/i18n";
import { normalizeLocale, type Locale } from "@/i18n/config";

export default function ProfilePage() {
  useInterfaceLocale();
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
        get title() { return uiText("settings:couldn_t_delete_your_account_c0cd25"); },
        get description() { return uiText("settings:please_try_again_83a6fd"); },
      });
    },
  });

  if (status === "loading" || profileQuery.isPending) {
    return (
      <div role="status" aria-label={uiText("settings:loading_profile_bbe4cb")} className="space-y-6">
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
        eyebrow={uiText("settings:account_85dfa3")}
        title={uiText("settings:profile_ff4fc0")}
        description={uiText("settings:your_identity_preferences_and_subscription_inside_the_e33391")}
      />

      {/* Identity hero */}
      <section className="rise panel mb-10 grid gap-5 p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <Avatar name={profile.full_name || profile.display_name || profile.email || "Survivor"} size={84} />
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-semibold tracking-wide uppercase">
            {profile.full_name || profile.display_name || uiText("settings:survivor_618954")}
          </h2>
          {profile.username ? (
            <p className="mt-1 text-sm text-muted-foreground">@{profile.username}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip color="var(--ember)">{uiText("settings:value_plan_0f949f", { value0: uiValue(profile.plan_name) })}</Chip>
            {summary ? <Chip>{uiText("settings:level_value_c5bf02", { value0: uiValue(summary.level) })}</Chip> : null}
            {summary ? <Chip>{rankTitle(summary.level, summary.level_title)}</Chip> : null}
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
          pushToast({ tone: "success", get title() { return uiText("settings:profile_saved_e9983d"); } });
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
      <Section id="subscription" eyebrow={uiText("settings:subscription_8fde48")} title={uiText("settings:plan_usage_cfff3d")}>
        {subscription && subscription.plan_code === "free" ? (
          <div className="space-y-3">
            <BillingCard subscription={subscription} />
            <Link
              to="/plans"
              className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary/90"
            >{uiText("settings:upgrade_plan_e80fe7")}</Link>
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
                <p className="font-semibold">{uiText("settings:value_plan_0f949f", { value0: uiValue(profile.plan_name) })}</p>
                <p className="text-sm text-muted-foreground">
                  {profile.plan_code === "free"
                    ? uiText("settings:your_daily_training_ration_fe2764")
                    : uiText("settings:active_subscription_ca7dbf")}
                </p>
              </div>
            </div>
            <Link
              to="/plans"
              className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-accent"
            >
              {profile.plan_code === "free" ? uiText("settings:upgrade_a6f47e") : uiText("settings:manage_plan_6db6a8")}
            </Link>
          </div>
        )}
        {usage ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-surface-2 p-4">
              <Eyebrow>{uiText("settings:lessons_today_d1486b")}</Eyebrow>
              {usage.limits.daily_lessons === null ? (
                <p className="mt-1.5 font-display text-3xl leading-none">{uiText("settings:unlimited_b8bef3")}</p>
              ) : (
                <>
                  <p className="mt-1.5 font-display text-3xl leading-none">
                    {usage.lesson_completions}{" "}
                    <span className="text-muted-foreground">/ {usage.limits.daily_lessons}</span>
                  </p>
                  <ProgressBar
                    className="mt-3"
                    value={(usage.limits.daily_lessons > 0 ? (usage.lesson_completions / usage.limits.daily_lessons) * 100 : 0)}
                    label={uiText("settings:lessons_used_today_9d80ee")}
                  />
                </>
              )}
            </div>
            <div className="rounded-lg border border-border bg-surface-2 p-4">
              <Eyebrow>{uiText("settings:field_tests_today_a10dbf")}</Eyebrow>
              {usage.limits.daily_quizzes === null ? (
                <p className="mt-1.5 font-display text-3xl leading-none">{uiText("settings:unlimited_b8bef3")}</p>
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
                    label={uiText("settings:field_tests_used_today_fc8629")}
                  />
                </>
              )}
            </div>
          </div>
        ) : null}
      </Section>

      {/* ── ACCOUNT / SESSION ── */}
      <Section id="account" eyebrow={uiText("settings:account_85dfa3")} title={uiText("settings:session_f7f199")}>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays aria-hidden="true" className="size-4" />{uiText("settings:member_since_f425b0")}{" "}{formatDate(profile.member_since)}
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
            <LogOut className="size-4" />{" "}{uiText("settings:sign_out_dc1649")}</button>
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
  useInterfaceLocale();
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
  first_name: string;
  last_name: string;
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
    first_name: profile.first_name ?? "",
    last_name: profile.last_name ?? "",
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
  useInterfaceLocale();
  const [draft, setDraft] = useState<DraftState>(() => toDraft(profile));
  const [saveError, setSaveError] = useState<string | null>(null);
  const currentLocale = useLocale();
  const t = useT();
  const client = useQueryClient();
  const languageMutation = useMutation({
    mutationFn: async (locale: Locale) => {
      await changeLocale(locale, { explicit: true });
      return updateProfile({ preferred_language: locale });
    },
    onSuccess: () => {
      // Do not replace the profile object and discard unrelated unsaved fields.
      // Fetch the server-confirmed preference and timestamp instead of inventing confirmation.
      void client.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });

  // Server is the authority — resync the draft whenever the profile
  // changes (initial load, after save, after invalidation).
  useEffect(() => {
    setDraft(toDraft(profile));
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: (d: DraftState) =>
      updateProfile({
        first_name: emptyToNull(d.first_name),
        last_name: emptyToNull(d.last_name),
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
      <Section id="profile" eyebrow={uiText("settings:identity_7e5a97")} title={uiText("settings:profile_ff4fc0")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pf-first-name">{uiText("settings:first_name_7e568a")}</Label>
            <Input
              id="pf-first-name"
              value={draft.first_name}
              onChange={(e) => { set("first_name")(e.target.value); }}
              placeholder={uiText("settings:your_first_name_8ee982")}
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-last-name">{uiText("settings:last_name_adec36")}</Label>
            <Input
              id="pf-last-name"
              value={draft.last_name}
              onChange={(e) => { set("last_name")(e.target.value); }}
              placeholder={uiText("settings:your_last_name_43bcb2")}
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-full-name">{uiText("settings:full_name_eeb692")}</Label>
            <Input
              id="pf-full-name"
              value={draft.full_name}
              onChange={(e) => { set("full_name")(e.target.value); }}
              placeholder={uiText("settings:your_name_in_the_field_9d0f57")}
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-username">{uiText("settings:username_84c290")}</Label>
            <Input
              id="pf-username"
              value={draft.username}
              onChange={(e) => { set("username")(e.target.value); }}
              placeholder="lowercase-handle-123"
              maxLength={30}
            />
            <p className="text-xs text-text-secondary">{uiText("settings:lowercase_letters_digits_and_3_30_characters_853f3f")}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-email">{uiText("settings:account_email_d705c6")}</Label>
            <Input id="pf-email" value={profile.email} readOnly disabled />
            <p className="text-xs text-text-secondary">{uiText("settings:verified_at_sign_in_account_emails_can_7efc16")}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-bio">{uiText("settings:bio_b31fc9")}</Label>
            <Input
              id="pf-bio"
              value={draft.bio}
              onChange={(e) => { set("bio")(e.target.value); }}
              placeholder={uiText("settings:a_line_about_you_and_your_preparedness_4df4fa")}
              maxLength={300}
            />
          </div>
        </div>
      </Section>

      <Section id="personal" eyebrow={uiText("settings:personal_40f073")} title={uiText("settings:region_language_61abc4")}>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <CountrySelect
              label={uiText("settings:country_d523eb")}
              id="pf-country"
              value={draft.country}
              onChange={(e) => { set("country")(e.target.value); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-timezone">{uiText("settings:timezone_d1f7dc")}</Label>
            <Input
              id="pf-timezone"
              value={draft.timezone}
              onChange={(e) => { set("timezone")(e.target.value); }}
              placeholder={uiText("settings:america_sao_paulo_4d70ae")}
              maxLength={64}
            />
            <p className="text-xs text-text-secondary">{uiText("settings:daily_limits_reset_on_your_timezone_utc_75e6e6")}</p>
          </div>
          <div className="space-y-1.5">
            <LanguageSelector id="pf-language"
              value={normalizeLocale(draft.preferred_language) ?? currentLocale}
              disabled={languageMutation.isPending}
              onChange={(locale) => {
                set("preferred_language")(locale);
                languageMutation.mutate(locale);
              }} />
            <p role="status" className="text-xs text-muted-foreground">
              {languageMutation.isPending ? t("savingLanguage") : languageMutation.isSuccess ? t("languageSaved") : ""}
            </p>
            {languageMutation.isError && <p role="alert" className="text-xs text-destructive">{t("languageSaveFailed")}</p>}
          </div>
        </div>
      </Section>

      <Section id="learning" eyebrow={uiText("settings:learning_1016fc")} title={uiText("settings:training_preferences_290c2e")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pf-experience">{uiText("settings:experience_level_9724ae")}</Label>
            <select
              id="pf-experience"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
              value={draft.experience_level}
              onChange={(e) => { set("experience_level")(e.target.value); }}
            >
              <option value="">{uiText("settings:prefer_not_to_say_0e4b20")}</option>
              <option value="beginner">{uiText("settings:beginner_60575a")}</option>
              <option value="intermediate">{uiText("settings:intermediate_b1cfe7")}</option>
              <option value="advanced">{uiText("settings:advanced_4d0647")}</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-reminder">{uiText("settings:learning_reminder_d5e077")}</Label>
            <select
              id="pf-reminder"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
              value={draft.reminder_preference}
              onChange={(e) => { set("reminder_preference")(e.target.value); }}
            >
              <option value="off">{uiText("settings:no_reminders_ce9679")}</option>
              <option value="daily">{uiText("settings:daily_728298")}</option>
              <option value="weekly">{uiText("settings:weekly_158f3d")}</option>
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pf-goals">{uiText("settings:learning_goals_optional_ae7548")}</Label>
            <Input
              id="pf-goals"
              value={draft.learning_goals}
              onChange={(e) => { set("learning_goals")(e.target.value); }}
              placeholder={uiText("settings:what_do_you_want_to_be_ready_68db6d")}
              maxLength={300}
            />
          </div>
        </div>
      </Section>

      <Section id="privacy" eyebrow={uiText("settings:privacy_cf0148")} title={uiText("settings:visibility_7d9ff4")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pf-visibility">{uiText("settings:profile_visibility_e717ee")}</Label>
            <select
              id="pf-visibility"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
              value={draft.profile_visibility}
              onChange={(e) => { set("profile_visibility")(e.target.value); }}
            >
              <option value="community">{uiText("settings:community_profile_97f00b")}</option>
              <option value="private">{uiText("settings:private_237dfa")}</option>
            </select>
            <p className="text-xs text-text-secondary">{uiText("settings:private_profiles_hide_your_bio_from_other_c01eb0")}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-avatar">{uiText("settings:avatar_visibility_f94939")}</Label>
            <select
              id="pf-avatar"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm"
              value={draft.avatar_visibility}
              onChange={(e) => { set("avatar_visibility")(e.target.value); }}
            >
              <option value="community">{uiText("settings:show_avatar_b95b75")}</option>
              <option value="private">{uiText("settings:hide_avatar_ac6446")}</option>
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pf-community-name">{uiText("settings:community_display_name_e0727e")}</Label>
            <Input
              id="pf-community-name"
              value={draft.community_display_name}
              onChange={(e) => { set("community_display_name")(e.target.value); }}
              placeholder={uiText("settings:how_other_members_see_you_defaults_to_17f559")}
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
          {saveMutation.isPending ? uiText("settings:saving_56a228") : uiText("settings:save_profile_f597c0")}
        </button>
        <button
          type="button"
          disabled={saveMutation.isPending}
          onClick={() => { setDraft(toDraft(profile)); }}
          className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-accent disabled:opacity-60"
        >{uiText("settings:reset_44c57a")}</button>
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
  useInterfaceLocale();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" onClick={() => { setOpen(true); }}>
        <Trash2 aria-hidden="true" className="size-4" />{uiText("settings:delete_account_1753c2")}</Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={uiText("settings:delete_your_account_35293d")}
        description={uiText("settings:this_permanently_deletes_your_account_progress_xp_e8d6cd")}
      >
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={() => { setOpen(false); }} disabled={pending}>{uiText("settings:keep_account_5a1234")}</Button>
          <Button variant="danger" loading={pending} onClick={onConfirm}>{uiText("settings:delete_permanently_e63b51")}</Button>
        </div>
      </Dialog>
    </>
  );
}
