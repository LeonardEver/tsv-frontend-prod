import { tr as uiText, useLocale as useInterfaceLocale, uiValue } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Compass, MapPinned } from "lucide-react";
import { Link } from "react-router";
import { queryKeys } from "@/lib/api/keys";
import { fetchModule } from "@/features/modules/modules.api";
import { ErrorState } from "@/components/shared/ErrorState";
import { MissionRoadmap } from "./MissionRoadmap";
import { SimplifiedShell } from "./SimplifiedShell";
import { useGuidedRoadmap } from "./use-guided-roadmap";
import { visualWorld } from "./config";
import styles from "./simplified.module.css";

export default function SimplifiedHome() {
  useInterfaceLocale();
  const guided = useGuidedRoadmap();
  const currentId = guided.status === "ready" ? guided.roadmap.current?.module_id ?? "" : "";

  // The module detail supplies the lesson-level completion the CTA label
  // reads. The recommendation itself is already decided by the roadmap.
  const currentDetail = useQuery({
    queryKey: queryKeys.content.module(currentId),
    queryFn: () => fetchModule(currentId),
    enabled: Boolean(currentId),
    staleTime: 5 * 60_000,
  });

  if (guided.status === "error") {
    return (
      <SimplifiedShell>
        <ErrorState error={guided.error} onRetry={guided.retry} />
      </SimplifiedShell>
    );
  }
  if (guided.status === "pending") {
    return (
      <SimplifiedShell>
        <div className={styles.loading} role="status" aria-label={uiText("learning:loading_expedition_40f758")} />
      </SimplifiedShell>
    );
  }
  if (guided.status === "empty") {
    return (
      <SimplifiedShell>
        <section className={styles.empty}>
          <Compass />
          <h1>{uiText("learning:your_path_is_being_prepared_d87324")}</h1>
          <p>{uiText("learning:published_missions_will_appear_here_bcbde8")}</p>
        </section>
      </SimplifiedShell>
    );
  }

  const { roadmap } = guided;
  const world = visualWorld(roadmap.category.code);
  const lessonDone = currentDetail.data?.lesson?.completed === true;
  const missionTo = roadmap.current ? `/simplified/missions/${roadmap.current.module_id}` : "/progress";
  const actionLabel = roadmap.current ? (roadmap.current.progress_pct > 0 || lessonDone ? uiText("dashboard:continue_mission_498583") : uiText("dashboard:start_mission_26b70a")) : uiText("learning:review_progress_afc225");

  return (
    <SimplifiedShell>
      <div className={`${styles.world} ${world.environmentClass}`}>
        <section className={styles.hero}>
          {world.image ? <img src={world.image} alt="" className={styles.heroImage} /> : null}
          <div className={styles.heroShade} />
          <div className={styles.heroContent}>
            <div className={styles.kicker}><MapPinned />{" "}{uiText("learning:current_region_244ef1")}</div>
            <h1>{roadmap.category.title}</h1>
            <p>{world.motif}</p>
            <div className={styles.progressHeader}><span>{uiText("learning:region_progress_ab4cd6")}</span><strong>{roadmap.progress}%</strong></div>
            <div className={styles.progressTrack}><span style={{ width: `${roadmap.progress}%` }} /></div>
          </div>
        </section>

        {roadmap.current ? (
          <section className={styles.nextMission} aria-labelledby="next-mission-title">
            <span className={styles.kicker}>{uiText("learning:next_mission_f2974d")}</span>
            <h2 id="next-mission-title">{roadmap.current.title}</h2>
            {roadmap.current.description ? <p>{roadmap.current.description}</p> : null}
            <Link to={missionTo} className={styles.primaryAction}>{actionLabel}<ArrowRight /></Link>
          </section>
        ) : (
          <section className={styles.nextMission}>
            <CheckCircle2 className={styles.completeIcon} />
            <h2>{uiText("learning:region_complete_8d4e79")}</h2>
            <p>{uiText("learning:every_published_mission_in_this_region_is_bca19d")}</p>
            <Link to={missionTo} className={styles.primaryAction}>{uiText("learning:review_progress_afc225")}<ArrowRight /></Link>
          </section>
        )}

        <section className={styles.pathSection}>
          <div className={styles.sectionHeading}><span>{uiText("learning:expedition_path_abbfe2")}</span><strong>{uiText("learning:value_missions_d4bb5e", { value0: uiValue(roadmap.modules.length) })}</strong></div>
          <MissionRoadmap stops={roadmap.modules} />
        </section>
      </div>
    </SimplifiedShell>
  );
}
