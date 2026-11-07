/**
 * Input + Label (design system §12.3).
 * Visible labels required; error state binds to aria-describedby.
 * No placeholder-only labels anywhere.
 */
import { forwardRef, useId, type InputHTMLAttributes, type LabelHTMLAttributes } from "react";
import { clsx } from "clsx";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={clsx("block text-sm font-medium text-text-secondary", className)}
      {...props}
    />
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Error text — sets aria-invalid and renders a linked error message. */
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={clsx(
          "min-h-11 rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary",
          "placeholder:text-text-disabled",
          "focus-visible:outline-2 focus-visible:outline-accent-ember focus-visible:outline-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-danger-blood",
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-sm text-danger-blood">
          {error}
        </p>
      ) : null}
    </div>
  );
});
