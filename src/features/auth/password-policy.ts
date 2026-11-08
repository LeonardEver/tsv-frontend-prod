/**
 * Password requirement checklist (feedback only — the backend enforces
 * the same policy server-side and is the authority; spec §4).
 *
 * Mirrors backend/src/modules/auth/password.ts. Keep in sync.
 */

import { tr as uiText } from "@/i18n";
export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", get label() { return uiText("authentication:at_least_12_characters_feb7e2"); }, test: (p) => p.length >= 12 },
  { id: "lower", get label() { return uiText("authentication:one_lowercase_letter_731c24"); }, test: (p) => /[a-z]/.test(p) },
  { id: "upper", get label() { return uiText("authentication:one_uppercase_letter_6d8f16"); }, test: (p) => /[A-Z]/.test(p) },
  { id: "number", get label() { return uiText("authentication:one_number_77d594"); }, test: (p) => /[0-9]/.test(p) },
  {
    id: "special",
    get label() { return uiText("authentication:one_special_character_45fba4"); },
    test: (p) => /[^A-Za-z0-9\s]/.test(p),
  },
];

export function passwordMeetsPolicy(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}
