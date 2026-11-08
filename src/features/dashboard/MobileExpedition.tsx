import { tr as uiText, useLocale as useInterfaceLocale, uiValue } from "@/i18n";
import { ArrowRight, Check, Compass, Flag, Flame, Mountain, RotateCcw } from "lucide-react";
import { Link } from "react-router";
import type { CategoryListResponse, ModuleListResponse, UsageResponse } from "@/lib/api/types";
import { sortModulesByCurriculum } from "@/lib/curriculum";
import { categoryDescription, codeFromSlug } from "@/lib/category-visuals";
import landscape from "@/assets/expedition-forest.jpg";
import styles from "./mobile-expedition.module.css";

type ModuleRow = ModuleListResponse["modules"][number];

export function MobileExpedition({ modules, categories, current, action, streak, usage }: {
  modules: ModuleRow[];
  categories: CategoryListResponse["categories"];
  current: ModuleRow;
  action: { to: string; ctaLabel: string } | null;
  streak?: number | undefined;
  usage?: UsageResponse | undefined;
}) {
  useInterfaceLocale();
  const category = categories.find((item) => item.slug === current.category);
  const rows = sortModulesByCurriculum(modules.filter((row) => row.category === current.category), (slug) => codeFromSlug(slug) ?? undefined);
  const completed = rows.filter((row) => row.completed).length;
  const pct = rows.length ? Math.round(completed / rows.length * 100) : 0;
  const currentIndex = rows.findIndex((row) => row.module_id === current.module_id);
  const firstVisible = Math.max(0, currentIndex - 1);
  const visibleRows = rows.slice(firstVisible, Math.max(currentIndex, 0) + 5);
  return (
    <section className={styles.expedition} aria-label={uiText("dashboard:your_mission_path_b5325b")}>
      <img src={landscape} alt="" className={styles.landscape} />
      <div className={styles.content}>
        <div className={styles.trailLabel}><span><Compass size={14} />{" "}{uiText("dashboard:your_expedition_d6b182")}</span>{streak !== undefined && <span className={styles.streak}><Flame size={15} /> {uiText("common:streak", { count: streak })}</span>}</div>
        <header className={styles.heading}>
          <span className={styles.regionIcon}><Mountain size={25} /></span>
          <div><h1>{category?.title ?? uiText("dashboard:your_next_adventure_0a010c")}</h1><p>{categoryDescription(category?.code ?? current.category)}</p></div>
        </header>
        <div className={styles.progress} role="progressbar" aria-label={uiText("dashboard:region_missions_completed_ccfa8d")} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${pct}%` }} /></div>
        <div className={styles.progressCopy}><span>{uiText("dashboard:value_of_value_missions_complete_99e378", { value0: uiValue(completed), value1: uiValue(rows.length) })}</span><strong>{pct}%</strong></div>
        <ol className={styles.path}>
          {visibleRows.map((row, index) => {
            const active = row.module_id === current.module_id;
            return (
              <li key={row.module_id} className={`${styles.stop} ${row.completed ? styles.completed : ""} ${active ? styles.current : ""}`}>
                <span className={styles.connector} aria-hidden="true" />
                <span className={styles.marker} aria-hidden="true">{row.completed ? <Check /> : active ? <Compass /> : <Flag size={18} />}</span>
                <div className={styles.stopContent}>
                  {active && <span className={styles.currentLabel}>{uiText("dashboard:your_next_mission_fae696")}</span>}
                  <h2><Link to={active && action ? action.to : `/modules/${row.module_id}/lesson`} state={active ? { startQuiz: true } : undefined}>{firstVisible + index + 1}. {row.title}</Link></h2>
                  <p>{row.description || (row.completed ? uiText("dashboard:knowledge_earned_ready_for_the_field_c3b042") : uiText("dashboard:build_your_skills_one_step_at_a_0f4e18"))}</p>
                  {active && action ? <Link to={action.to} state={{ startQuiz: true }} className={styles.continue}>{action.ctaLabel === "Take lesson" ? uiText("dashboard:start_mission_26b70a") : uiText("dashboard:continue_mission_498583")}<ArrowRight size={18} /></Link> : null}
                  {row.completed && <span className={styles.done}><Check size={12} />{" "}{uiText("dashboard:completed_1798b3")}{" "}<RotateCcw size={11} /></span>}
                </div>
              </li>
            );
          })}
        </ol>
        <Link to={`/categories/${current.category}`} className={styles.allMissions}>{uiText("dashboard:explore_all_a47b25")}{" "}{rows.length}{" "}{uiText("dashboard:missions_4ef679")}{" "}<ArrowRight size={14} /></Link>
        <p className={styles.motto}>{uiText("dashboard:small_steps_a_safer_tomorrow_39d239")}</p>
        {usage && <div className={styles.daily}><span>{uiText("dashboard:today_24345a")}{" "}<strong>{usage.lesson_completions}/{usage.limits.daily_lessons ?? "∞"}</strong>{" "}{uiText("dashboard:lessons_99f744")}{" "}<strong>{usage.quiz_attempts}/{usage.limits.daily_quizzes ?? "∞"}</strong>{" "}{uiText("dashboard:field_tests_c432f2")}</span><Link to="/plans">{usage.plan_name} <ArrowRight size={13} /></Link></div>}
      </div>
    </section>
  );
}
