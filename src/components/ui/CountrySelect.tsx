/**
 * Country / Region selector (ISO 3166-1 alpha-2 codes; spec §28).
 * Mirrors the token-styled native select convention (ProfileEditor).
 */
import { useId, type SelectHTMLAttributes } from "react";
import { clsx } from "clsx";
import { Label } from "./Input";
import { COUNTRIES } from "@/lib/geo/countries";

export interface CountrySelectProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  /** Optional first option (defaults to a neutral prompt). */
  placeholder?: string;
}

export function CountrySelect({
  label,
  error,
  id,
  className,
  placeholder = "Select a country or region",
  ...props
}: CountrySelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={selectId}>{label}</Label>
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={clsx(
          // `w-full` + `min-w-0`: a native select is as wide as its widest
          // option unless constrained, and country names are long — inside
          // a padded panel that is enough to push the page sideways.
          "min-h-11 w-full min-w-0 rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground",
          "focus-visible:outline-2 focus-visible:outline-[var(--ember)] focus-visible:outline-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-[var(--destructive)]",
          className,
        )}
        {...props}
      >
        <option value="">{placeholder}</option>
        {COUNTRIES.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </select>
      {error ? (
        <p id={errorId} className="text-sm text-[var(--destructive)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
