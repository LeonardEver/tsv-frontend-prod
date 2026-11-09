import { tr as uiText, useLocale as useInterfaceLocale } from "@/i18n";
import { useNavigate } from "react-router";
import { cn } from "@/components/sa/primitives";
import { Button } from "@/components/ui/Button";
import { useExperienceMode } from "./state";
import styles from "./mode-switch.module.css";

export function ModeSwitch({ compact = false }: { compact?: boolean }) {
  useInterfaceLocale();
  const [mode, setMode] = useExperienceMode();
  const navigate = useNavigate();

  const select = (next: "pro" | "simplified") => {
    setMode(next);
    void navigate(next === "simplified" ? "/simplified" : "/");
  };

  return (
    <div
      className={cn(
        "inline-grid grid-cols-2 rounded-md border border-border bg-surface-2 p-0.5",
        compact ? styles.compact : "text-xs",
      )}
      role="group"
      aria-label={uiText("learning:experience_5b5aaf")}
    >
      {(["pro", "simplified"] as const).map((option) => (
        <Button
          key={option}
          type="button"
          variant="ghost"
          onClick={() => { select(option); }}
          aria-pressed={mode === option}
          className={cn(
            "min-h-9 rounded px-2.5 font-mono font-semibold uppercase transition-colors",
            mode === option
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option === "pro" ? "PRO" : uiText("common:modeSimplified")}
        </Button>
      ))}
    </div>
  );
}
