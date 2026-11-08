import { tr as uiText, useLocale as useInterfaceLocale } from "@/i18n";
import type { LucideIcon } from "lucide-react";
import { Mountain } from "lucide-react";
import { cn } from "@/components/sa/primitives";
import goldFrame from "@/assets/rewards-badge-gold.png";
import silverFrame from "@/assets/rewards-badge-silver.png";
import styles from "./rewards.module.css";

export function RewardBadge({ gold = false, icon: Icon = Mountain, level, className }: {
  gold?: boolean; icon?: LucideIcon; level?: number; className?: string;
}) {
  useInterfaceLocale();
  return (
    <div className={cn(styles.badge, gold && styles.goldBadge, level !== undefined && styles.levelBadge, className)} aria-hidden="true">
      <img src={gold ? goldFrame : silverFrame} alt="" width={384} height={384} />
      <Icon className={styles.badgeGlyph} />
      {level !== undefined && <span className={styles.levelNumber}>{level}<span>{uiText("rewards:level_7c7f5d")}</span></span>}
    </div>
  );
}
