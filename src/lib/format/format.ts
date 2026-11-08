/**
 * Display formatting (frontend spec §3.1: "no feature computes
 * gamification numbers" — formatting only, never authority). Also
 * holds shared presentation mappings (difficulty tone, action labels)
 * so features do not re-declare them.
 */
import { formattingLocale, getLocale, tr } from "@/i18n";

export function formatResourceType(type: string): string {
  const keys = { checklist: "learning:resourceChecklist", guide: "learning:resourceGuide", table: "learning:resourceTable", map: "learning:resourceMap", template: "learning:resourceTemplate", worksheet: "learning:resourceWorksheet" } as const;
  const normalized = type.toLowerCase();
  if (normalized === "pdf") return "PDF";
  return Object.hasOwn(keys, normalized) ? tr(keys[normalized as keyof typeof keys]) : tr("learning:resourceOther");
}

export function formatRedistribution(value: string): string {
  const keys = { allowed: "learning:redistributionAllowed", restricted: "learning:redistributionRestricted", "not-allowed": "learning:redistributionNotAllowed", unknown: "learning:redistributionUnknown" } as const;
  return Object.hasOwn(keys, value) ? tr(keys[value as keyof typeof keys]) : tr("learning:redistributionUnknown");
}

export function formatScorePct(score: number): string {
  return `${Math.round(score)}%`;
}

/** Plain integer with thousands separators (analytics counts). */
export function formatCount(value: number): string {
  return new Intl.NumberFormat(formattingLocale()).format(value);
}

/** Percentage at the API's own precision — the analytics endpoints emit
 * 0–100 to two decimals. NOT rounded: rounding would lose the difference
 * between 0.4% and 0.04%, which is exactly what a low-retention cohort
 * looks like. */
export function formatPct(value: number, digits = 2): string {
  return `${new Intl.NumberFormat(formattingLocale(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)}%`;
}

/** Ratio at two decimals (the analytics endpoints' average precision). */
export function formatAverage(value: number): string {
  return new Intl.NumberFormat(formattingLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

/** Difficulty → badge tone (presentation mapping for the backend's
 * difficulty enum; status is never communicated by color alone). */
export const difficultyTone: Record<string, "success" | "warning" | "danger"> = {
  beginner: "success",
  intermediate: "warning",
  advanced: "danger",
};

/** Backend difficulty enum → display label ("beginner" → "Beginner"). */
export function formatDifficulty(d: string | null | undefined): string {
  const map: Record<string, string> = {
    beginner: tr("difficultyBeginner"),
    intermediate: tr("difficultyIntermediate"),
    advanced: tr("difficultyAdvanced"),
  };
  return map[d ?? ""] ?? tr("difficultyBeginner");
}

/** Learning-action labels for user-facing copy (frontend spec §7) —
 * internal action codes never surface in the UI. */
export function formatActivityAction(action: string): string {
  const labels: Record<string, string> = {
    lesson_completed: tr("actionLessonCompleted"), quiz_completed: tr("actionQuizCompleted"),
    module_completed: tr("actionModuleCompleted"), lesson_started: tr("actionLessonStarted"),
    quiz_started: tr("actionQuizStarted"),
  };
  return labels[action] ?? tr("actionLearningActivity");
}

export function formatDurationMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(formattingLocale(), {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatXp(xp: number): string {
  return new Intl.NumberFormat(formattingLocale()).format(xp);
}

/** Compact relative time for community timestamps ("2h ago", "3d ago"). */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return formatDate(iso);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return tr("justNow");
  if (getLocale() !== "en") {
    const formatter = new Intl.RelativeTimeFormat(formattingLocale(), { numeric: "auto", style: "short" });
    if (minutes < 60) return formatter.format(-minutes, "minute");
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return formatter.format(-hours, "hour");
    const days = Math.floor(hours / 24);
    if (days < 7) return formatter.format(-days, "day");
    return formatDate(iso);
  }
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

const moneyFormatters = new Map<string, Intl.NumberFormat>();

/** Locale-aware currency display. The server's amount and ISO 4217 code
 * remain authoritative; choosing a language never converts the billing currency. */
export function formatMoney(amount: number, currency: string): string {
  // Preserve the established compact zero display in the English catalog.
  if (amount === 0 && currency.toUpperCase() === "USD" && getLocale() === "en") return "$0";
  const code = currency.toUpperCase();
  const cacheKey = formattingLocale() + ":" + code;
  let formatter = moneyFormatters.get(cacheKey);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat(formattingLocale(), {
        style: "currency",
        currency: code,
      });
    } catch {
      // Unknown currency code — never crash the plans surface.
      return `${new Intl.NumberFormat(formattingLocale()).format(amount)} ${code}`;
    }
    moneyFormatters.set(cacheKey, formatter);
  }
  return formatter.format(amount);
}
