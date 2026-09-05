/**
 * Button (design system §12.3).
 * Variants: primary / secondary / ghost / danger. Sizes: sm / md / lg.
 * Loading state is the double-submit guard primitive (aria-busy +
 * pointer-events off). 44px+ touch targets on coarse pointers.
 */
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  /** Render as a child element (e.g. <a>) via Radix Slot. */
  asChild?: boolean;
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-accent-ember text-accent-on hover:bg-accent-ember-hover shadow-glow-ember active:shadow-none",
  secondary: "bg-bg-elevated text-text-primary border border-border-default hover:bg-bg-surface",
  ghost: "text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
  danger: "bg-danger-blood text-white hover:brightness-110",
};

/** Shared microinteraction (Phase 16.5 §18): press response + color
 * transition on every variant/size. */
const interactionClasses =
  "transition-all active:translate-y-px active:scale-[0.99]";

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      asChild,
      className,
      children,
      type = "button",
      ...props
    },
    ref,
  ) {
    // asChild: the Slot must receive EXACTLY ONE element child — loading
    // and asChild are mutually exclusive (a link cannot be "loading").
    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={clsx(
            "inline-flex min-h-11 items-center justify-center gap-2 rounded-md font-semibold",
            "focus-visible:outline-2 focus-visible:outline-accent-ember focus-visible:outline-offset-2",
            "disabled:pointer-events-none disabled:opacity-50",
            variantClasses[variant],
            sizeClasses[size],
            interactionClasses,
            className,
          )}
          {...props}
        >
          {children}
        </Slot>
      );
    }
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={clsx(
          "inline-flex min-h-11 items-center justify-center gap-2 rounded-md font-semibold",
          "focus-visible:outline-2 focus-visible:outline-accent-ember focus-visible:outline-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          interactionClasses,
          className,
        )}
        {...props}
      >
        {loading ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
        {children}
      </button>
    );
  },
);
