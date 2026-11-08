import { tr as uiText, useLocale as useInterfaceLocale, uiValue } from "@/i18n";
import { Check, LockKeyhole, Navigation } from "lucide-react";
import { Link } from "react-router";
import type { RoadmapStop } from "./roadmap";
import styles from "./simplified.module.css";

export function MissionRoadmap({ stops }: { stops: RoadmapStop[] }) {
  useInterfaceLocale();
  return (
    <ol className={styles.roadmap} aria-label={uiText("learning:mission_roadmap_706a6c")}>
      {stops.map((stop, index) => {
        const body = (
          <>
            <span className={styles.marker} aria-hidden="true">
              {stop.status === "completed" ? <Check /> : stop.status === "locked" ? <LockKeyhole /> : <Navigation />}
            </span>
            <span className={styles.stopCopy}>
              <span className={styles.stopState}>
                {stop.status === "completed" ? uiText("learning:completed_1798b3") : stop.status === "current" ? uiText("learning:you_are_here_b900c1") : uiText("learning:locked_a79888")}
              </span>
              <strong>{stop.module.title}</strong>
              {stop.module.estimated_duration ? <small>{uiText("learning:value_min_b71afd", { value0: uiValue(stop.module.estimated_duration) })}</small> : null}
            </span>
          </>
        );
        return (
          <li key={stop.module.module_id} className={styles[stop.status]}>
            {index < stops.length - 1 ? <span className={styles.trail} aria-hidden="true" /> : null}
            {stop.status === "current" ? (
              <Link to={`/simplified/missions/${stop.module.module_id}`} className={styles.stop}>{body}</Link>
            ) : (
              <div className={styles.stop}>{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}