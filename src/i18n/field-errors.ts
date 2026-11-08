import { tr } from "./index";

/** Backend messages are never used as executable translation keys. Unknown validation
 * details get useful localized copy while the original error remains in memory for diagnostics. */
export function fieldError(message: string | undefined, path: string): string {
  const passwordMessages = {
    "Password must include at least one lowercase letter.": "passwordLower",
    "Password must include at least one uppercase letter.": "passwordUpper",
    "Password must include at least one number.": "passwordNumber",
    "Password must include at least one special character.": "passwordSpecial",
    "Password must be at least 12 characters long.": "passwordMin",
    "Password must be at most 128 characters long.": "passwordMax",
  } as const;
  if (message && message in passwordMessages) return tr(passwordMessages[message as keyof typeof passwordMessages]);
  if (message === "This field is required." || message === "Required") return tr("requiredField");
  if (message === "Enter a valid email address." || path === "email") return tr("invalidEmail");
  if (message === "Date of birth cannot be in the future.") return tr("futureBirthDate");
  const minimumAge = message?.match(/^You must be at least (\d+) years old/);
  if (minimumAge?.[1]) return tr("minimumAge", { age: Number(minimumAge[1]) });
  if (path === "date_of_birth") return tr("invalidBirthDate");
  if (path === "country") return tr("invalidCountry");
  if (path === "accept_terms") return tr("acceptTerms");
  if (path === "accept_privacy") return tr("acceptPrivacy");
  const max = message?.match(/^Must be at most (\d+) characters/);
  if (max?.[1]) return tr("maxCharacters", { count: Number(max[1]) });
  if (message === "Must not contain control characters.") return tr("invalidCharacters");
  if (path === "password" || path === "new_password") return tr("passwordPolicy");
  return tr("invalidValue");
}
