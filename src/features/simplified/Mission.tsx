import { tr as uiText, useLocale as useInterfaceLocale } from "@/i18n";
import { ContentLanguageNotice } from "@/i18n/ContentLanguageNotice";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, Check, ClipboardCheck, LockKeyhole } from "lucide-react";
import { Link, useParams } from "react-router";
import { allLocales, queryKeys } from "@/lib/api/keys";
import { fetchModule } from "@/features/modules/modules.api";
import { completeLesson, fetchLesson } from "@/features/lesson/lesson.api";
import { MarkdownContent } from "@/components/shared/MarkdownContent";
import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/Button";
import { useCurrentUserId } from "@/features/auth/use-user-id";
import { useUiStore } from "@/stores/ui-store";
import { visualWorld } from "./config";
import { moduleImage } from "@/lib/module-visuals";
import { missionGateFrom } from "./mission-gate";
import { SimplifiedShell } from "./SimplifiedShell";
import styles from "./simplified.module.css";

type MissionStage = "context" | "learn" | "practice" | "apply" | "complete";
const STAGES: MissionStage[] = ["context", "learn", "practice", "apply", "complete"];

function stageForSection(type: string, index: number, total: number): MissionStage {
  const normalized = type.toLowerCase();
  if (normalized.includes("intro") || index === 0) return "context";
  if (normalized.includes("practice") || normalized.includes("recap")) return "practice";
  if (normalized.includes("application") || normalized.includes("scenario") || index === total - 1) return "apply";
  return "learn";
}

export default function SimplifiedMission() {
  useInterfaceLocale();
  const { moduleId = "" } = useParams();
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  const pushToast = useUiStore((state) => state.pushToast);
  const [stageIndex, setStageIndex] = useState(0);
  const moduleQuery = useQuery({
    queryKey: queryKeys.content.module(moduleId),
    queryFn: () => fetchModule(moduleId),
    placeholderData: (previous) => previous?.module_id === moduleId ? previous : undefined,
    retry: false,
  });
  const lessonId = moduleQuery.data?.lesson?.lesson_id;
  const lessonQuery = useQuery({
    queryKey: lessonId ? queryKeys.content.lesson(lessonId) : ["lessons", "pending"],
    queryFn: () => fetchLesson(lessonId ?? ""),
    placeholderData: (previous) => previous?.lesson_id === lessonId ? previous : undefined,
    enabled: Boolean(lessonId),
    retry: false,
  });
  const sections = useMemo(() => lessonQuery.data?.sections.filter((section) => section.type !== "learning_objectives") ?? [], [lessonQuery.data]);
  const grouped = useMemo(() => STAGES.slice(0, 4).map((stage) => ({
    stage,
    sections: sections.filter((section, index) => stageForSection(section.type, index, sections.length) === stage),
  })), [sections]);
  const visibleStages = grouped.filter((group) => group.sections.length > 0).map((group) => group.stage);
  const missionStages: MissionStage[] = [...visibleStages, "complete"];
  const activeStage = missionStages[Math.min(stageIndex, missionStages.length - 1)] ?? "complete";

  const completion = useMutation({
    mutationFn: () => completeLesson({ lessonId: lessonId ?? "", lastPosition: stageIndex }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: allLocales(queryKeys.content.lesson(lessonId ?? "")) });
      void queryClient.invalidateQueries({ queryKey: allLocales(queryKeys.content.module(moduleId)) });
      void queryClient.invalidateQueries({ queryKey: allLocales(queryKeys.content.modulesAll) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.learning.progress });
      void queryClient.invalidateQueries({ queryKey: queryKeys.learning.moduleProgress(moduleId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.gamification.summary });
      void queryClient.invalidateQueries({ queryKey: queryKeys.plans.usage(userId) });
    },
    onError: () => { pushToast({ tone: "error", get title() { return uiText("learning:couldn_t_save_your_completion_7c723c"); }, get description() { return uiText("learning:please_try_again_83a6fd"); } }); },
  });

  if (moduleQuery.isError) return <SimplifiedShell><ErrorState error={moduleQuery.error} onRetry={() => void moduleQuery.refetch()} /></SimplifiedShell>;
  if (lessonQuery.isError) return <SimplifiedShell><ErrorState error={lessonQuery.error} onRetry={() => void lessonQuery.refetch()} /></SimplifiedShell>;
  if (moduleQuery.isPending || moduleQuery.isPlaceholderData || lessonQuery.isPlaceholderData || (lessonId && lessonQuery.isPending)) return <SimplifiedShell><div className={styles.loading} role="status" aria-label={uiText("learning:loading_mission_e01030")} /></SimplifiedShell>;
  const mod = moduleQuery.data;
  const lesson = lessonQuery.data;
  if (!lesson) {
    return <SimplifiedShell><section className={styles.empty}><h1>{uiText("learning:mission_unavailable_700bc9")}</h1><Link to="/simplified">{uiText("learning:return_to_path_7d9304")}</Link></section></SimplifiedShell>;
  }
  const world = visualWorld(mod.category);
  const group = grouped.find((item) => item.stage === activeStage);
  const alreadyCompleted = lesson.progress.completed || completion.isSuccess;
  const atFinish = activeStage === "complete";
  // The Simplified sequence, not the plan: this mission's own lesson must be
  // complete before the field test is offered (see ./mission-gate).
  const canQuiz = missionGateFrom(mod) === "open";

  return (
    <SimplifiedShell>
      <article className={`${styles.mission} ${world.environmentClass}`}>
        <header className={styles.missionHeader}>
          {moduleImage(moduleId) ? <img src={moduleImage(moduleId) ?? undefined} alt="" className={styles.heroImage} /> : null}
          <div className={styles.heroShade} />
          <div className={styles.missionHeaderContent}>
            <Link to="/simplified" className={styles.back}><ArrowLeft />{" "}{uiText("learning:expedition_path_abbfe2")}</Link>
            <span className={styles.kicker}>{uiText("learning:guided_mission_589c19")}</span>
            <h1>{lesson.title}</h1>
            <p>{mod.description}</p>
          </div>
        </header>

        <nav className={styles.stageNav} aria-label={uiText("learning:mission_stages_a73548")}>
          {missionStages.map((stage, index) => (
            <Button key={stage} variant="ghost" onClick={() => { if (index <= stageIndex) setStageIndex(index); }} disabled={index > stageIndex} aria-current={index === stageIndex ? "step" : undefined}>
              <span>{index < stageIndex || alreadyCompleted ? <Check /> : index + 1}</span>{uiText(({ context: "learning:stageContext", learn: "learning:stageLearn", practice: "learning:stagePractice", apply: "learning:stageApply", complete: "learning:stageComplete" } as const)[stage])}
            </Button>
          ))}
        </nav>

        <ContentLanguageNotice data={lesson} />
        <div className={styles.missionBody}>
          {!atFinish ? (
            <section className={styles.lessonStage}>
              <span className={styles.kicker}>{activeStage}</span>
              {group?.sections.map((section, index) => (
                <div key={`${section.heading}-${index}`} className={styles.contentBlock}>
                  <h2>{section.heading}</h2>
                  <MarkdownContent content={section.content} />
                </div>
              ))}
              <div className={styles.stageActions}>
                <Button variant="secondary" onClick={() => { setStageIndex((value) => Math.max(0, value - 1)); }} disabled={stageIndex === 0}>{uiText("learning:back_b52b36")}</Button>
                <Button onClick={() => { setStageIndex((value) => Math.min(missionStages.length - 1, value + 1)); }}>{uiText("learning:continue_2e0262")}{" "}<ArrowRight /></Button>
              </div>
            </section>
          ) : (
            <section className={styles.finish}>
              <span className={styles.finishMark}><Check /></span>
              <span className={styles.kicker}>{uiText("learning:mission_debrief_f7691e")}</span>
              <h2>{alreadyCompleted ? uiText("learning:mission_complete_630505") : uiText("learning:ready_to_complete_30a6fb")}</h2>
              <p>{uiText("learning:save_this_lesson_then_test_what_you_259d48")}</p>
              {!alreadyCompleted ? <Button size="lg" loading={completion.isPending} onClick={() => { completion.mutate(); }}>{uiText("learning:complete_mission_81bd11")}</Button> : null}
              <div className={styles.finishActions}>
                {mod.quiz ? (
                  canQuiz ? (
                    <Button asChild size="lg"><Link to={`/simplified/missions/${moduleId}/test`}><ClipboardCheck />{" "}{uiText("learning:take_field_test_1e927f")}</Link></Button>
                  ) : (
                    <span className={styles.lockedQuiz}><LockKeyhole />{" "}{uiText("learning:field_test_unlocks_after_completion_6c7160")}</span>
                  )
                ) : null}
                <Button asChild variant="secondary"><Link to={`/modules/${moduleId}/lesson`}><BookOpen />{" "}{uiText("learning:open_field_manual_27d504")}</Link></Button>
              </div>
            </section>
          )}
        </div>
      </article>
    </SimplifiedShell>
  );
}
