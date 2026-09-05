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
          "min-h-11 rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary",
          "focus-visible:outline-2 focus-visible:outline-accent-ember focus-visible:outline-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-danger-blood",
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
        <p id={errorId} className="text-sm text-danger-blood">
          {error}
        </p>
      ) : null}
    </div>
  );
}
