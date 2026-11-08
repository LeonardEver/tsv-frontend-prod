import { tr as uiText, useLocale as useInterfaceLocale } from "@/i18n";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { BookOpen, Map, UserRound } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ToastHost } from "@/components/layout/ToastHost";
import { ModeSwitch } from "./ModeSwitch";
import styles from "./simplified.module.css";

export function SimplifiedShell({ children }: { children: ReactNode }) {
  useInterfaceLocale();
  const { pathname } = useLocation();
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/simplified" aria-label={uiText("learning:simplified_home_fb4408")}><BrandMark compact /></Link>
        <div className={styles.headerActions}>
          <ModeSwitch compact />
          <ThemeToggle />
        </div>
      </header>
      <main id="main" className={styles.main}>{children}</main>
      <nav className={styles.bottomNav} aria-label={uiText("learning:simplified_navigation_a62616")}>
        <Link to="/simplified" aria-current={pathname === "/simplified" ? "page" : undefined}>
          <Map aria-hidden="true" /> <span>{uiText("learning:path_519e39")}</span>
        </Link>
        <Link to="/categories"><BookOpen aria-hidden="true" /> <span>{uiText("learning:manuals_18db59")}</span></Link>
        <Link to="/profile"><UserRound aria-hidden="true" /> <span>{uiText("learning:profile_ff4fc0")}</span></Link>
      </nav>
      <ToastHost />
    </div>
  );
}