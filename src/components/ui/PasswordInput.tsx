/**
 * Password input with visibility toggle (spec §26).
 * Extends the design-system Input; never lowers the security bar —
 * toggling only changes the INPUT type, not what is submitted.
 */
import { forwardRef, useState, useId, type InputHTMLAttributes } from "react";
import { clsx } from "clsx";
import { Eye, EyeOff } from "lucide-react";
import { Label, Input } from "./Input";

export interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ label, error, id, className, ...props }, ref) {
    const autoId = useId();
    const inputId = id ?? autoId;
    const [visible, setVisible] = useState(false);

    return (
      <div className="flex flex-col gap-1">
        <Label htmlFor={inputId}>{label}</Label>
        <div className="relative">
          <Input
            ref={ref}
            id={inputId}
            type={visible ? "text" : "password"}
            error={error}
            className={clsx("pr-11", className)}
            {...props}
          />
          <button
            type="button"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            onClick={() => { setVisible((v) => !v); }}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-text-disabled transition-colors hover:text-text-secondary"
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
    );
  },
);
