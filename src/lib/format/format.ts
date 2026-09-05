/**
 * Display formatting (frontend spec §3.1: "no feature computes
 * gamification numbers" — formatting only, never authority). Also
 * holds shared presentation mappings (difficulty tone, action labels)
 * so features do not re-declare them.
 */
export function formatScorePct(score: number): string {
  return `${Math.round(score)}%`;
}

/** Difficulty → badge tone (presentation mapping for the backend's
 * difficulty enum; status is never communicated by color alone). */
export const difficultyTone: Record<string, "success" | "warning" | "danger"> = {
  beginner: "success",
  intermediate: "warning",
  advanced: "danger",
};

/** Backend difficulty enum → display label ("beginner" → "Beginner"). */
export function formatDifficulty(d: string | null | undefined): "Beginner" | "Intermediate" | "Advanced" {
  const map: Record<string, "Beginner" | "Intermediate" | "Advanced"> = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
  };
  return map[d ?? ""] ?? "Beginner";
}

/** Learning-action labels for user-facing copy (frontend spec §7) —
 * internal action codes never surface in the UI. */
const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  lesson_completed: "Lesson completed",
  quiz_completed: "Quiz completed",
  module_completed: "Mission completed",
};

export function formatActivityAction(action: string): string {
  return ACTIVITY_ACTION_LABELS[action] ?? action.replaceAll("_", " ");
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
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatXp(xp: number): string {
  return new Intl.NumberFormat().format(xp);
}

/** Compact relative time for community timestamps ("2h ago", "3d ago"). */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return formatDate(iso);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

const moneyFormatters = new Map<string, Intl.NumberFormat>();

/** Currency display from the server's price + currency code (ISO 4217
 * lowercase from the API, e.g. "usd", "brl"). The app's display
 * language is English — the locale is pinned so pricing renders
 * identically everywhere. */
export function formatMoney(amount: number, currency: string): string {
  const code = currency.toUpperCase();
  let formatter = moneyFormatters.get(code);
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: code,
      });
    } catch {
      // Unknown currency code — never crash the plans surface.
      formatter = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      });
    }
    moneyFormatters.set(code, formatter);
  }
  return formatter.format(amount);
}
