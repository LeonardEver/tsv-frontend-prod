/**
 * Rewards presents server-owned ranks, XP and achievement states.
 * Artwork is decorative. Missing achievement progress never becomes zero.
 */
import { tr as uiText, useLocale as useInterfaceLocale, uiValue } from "@/i18n";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, BookOpen, Brain, CalendarDays, Check, ChevronsUp, Droplet, Flame, Layers, LockKeyhole, Mountain, Trophy, type LucideIcon } from "lucide-react";
import { queryKeys } from "@/lib/api/keys";
import type { AchievementsResponse } from "@/lib/api/types";
import { cn, Eyebrow, LevelBadge, ProgressBar, SectionHeader, Stat } from "@/components/sa/primitives";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate, formatXp } from "@/lib/format/format";
import { fetchGamificationSummary } from "@/features/dashboard/dashboard.api";
import { fetchAchievements } from "./gamification.api";
import { nextRankTarget, rankName, rankTitle, visibleRanks } from "./rewards-presenter";
import { RewardBadge } from "./RewardBadge";
import camp from "@/assets/rewards-camp.jpg";
import stream from "@/assets/rewards-stream.jpg";
import earnedScene from "@/assets/rewards-earned.jpg";
import forest from "@/assets/learn-forest.jpg";
import fire from "@/assets/fire.jpg";
import map from "@/assets/navigation.jpg";
import summit from "@/assets/progress-summit.jpg";
import styles from "./rewards.module.css";

const XP_SOURCE_LABELS: Record<string, string> = {
  lesson_completed: "Lesson completed", quiz_completed: "Quiz completed",
  quiz_passed: "Quiz passed", module_completed: "Module completed",
  achievement: "Achievement", achievement_earned: "Achievement",
  streak_milestone: "Streak milestone",
};

const ACHIEVEMENT_ART: Record<string, { icon: LucideIcon; scene: string }> = {
  first_quiz_passed: { icon: Check, scene: earnedScene },
  first_water_module: { icon: Droplet, scene: stream },
  fire_starter: { icon: Flame, scene: fire },
  water_master: { icon: Droplet, scene: stream },
  week_warrior: { icon: CalendarDays, scene: forest },
  quiz_master: { icon: Brain, scene: map },
  lesson_scholar: { icon: BookOpen, scene: summit },
};

export default function GamificationPage() {
  useInterfaceLocale();
  const summaryQuery = useQuery({
    queryKey: queryKeys.gamification.summary, queryFn: fetchGamificationSummary,
    staleTime: 30_000, refetchOnWindowFocus: true,
  });
  const achievementsQuery = useQuery({
    queryKey: queryKeys.gamification.achievements, queryFn: fetchAchievements,
    staleTime: 30_000, refetchOnWindowFocus: true,
  });
  const summary = summaryQuery.data;
  const achievements = achievementsQuery.data;
  const earnedCount = achievements?.earned.length ?? summary?.achievements_earned ?? 0;
  const totalCount = achievements ? achievements.earned.length + achievements.unearned.length : 0;
  const unlockedPct = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;
  const target = summary ? nextRankTarget(summary) : null;
  const maximumRank = summary?.xp_to_next_level === null;

  return (
    <div className={styles.page}>
      <h1 className="sr-only">{uiText("rewards:rewards_and_progression_398642")}</h1>
      {summaryQuery.isError ? (
        <ErrorState error={summaryQuery.error} onRetry={() => void summaryQuery.refetch()} />
      ) : summary ? (
        <>
          <section className={styles.hero} aria-label={uiText("rewards:current_rank_affa54")}>
            <img src={camp} alt="" width={1920} height={640} className={styles.heroScene} fetchPriority="high" />
            <RewardBadge gold level={summary.level} className={styles.heroBadge} />
            <div className={styles.heroContent}>
              <Eyebrow>{uiText("rewards:current_title_3d4b9e")}</Eyebrow>
              <h2>{rankTitle(summary.level, summary.level_title)}</h2>
              <div className={styles.rankCaption}>
                <LevelBadge level={summary.level} />
                <p>{maximumRank ? uiText("rewards:maximum_level_reached_b041b8") : uiText("rewards:value_xp_toward_level_value_6253e8", { value0: uiValue(formatXp(summary.xp_to_next_level ?? 0)), value1: uiValue(summary.level + 1) })}</p>
              </div>
              {target && (
                <div className={styles.heroProgress}>
                  <ProgressBar value={target.pct} label={uiText("rewards:total_xp_toward_level_value_a1a2f8", { value0: uiValue(summary.level + 1) })} />
                  <span>{uiText("rewards:value_value_xp_f7de48", { value0: uiValue(formatXp(summary.total_xp)), value1: uiValue(formatXp(target.total)) })}</span>
                </div>
              )}
            </div>
          </section>

          <section className={styles.stats} aria-label={uiText("rewards:reward_statistics_711369")}>
            <RewardStat icon={ChevronsUp} medal className={styles.xpStat}><Stat label={uiText("rewards:total_xp_de22fa")} value={formatXp(summary.total_xp)} color="var(--ember)" /></RewardStat>
            <RewardStat icon={Flame} className={styles.streakStat}><Stat label={uiText("rewards:streak_ac4792")} value={uiText("common:days", { count: summary.current_streak })} hint={uiText("rewards:personal_best_value_value_keep_it_alive_b65f00", { value0: uiValue(summary.longest_streak), value1: uiValue(summary.longest_streak === 1 ? uiText("rewards:day_a2620c") : uiText("rewards:days_5548ae")) })} /></RewardStat>
            <RewardStat icon={Trophy} className={styles.achievementsStat}><Stat label={uiText("rewards:achievements_a6634f")} value={totalCount > 0 ? `${earnedCount} / ${totalCount}` : earnedCount} /></RewardStat>
          </section>

          <div className={styles.progressionGrid}>
            <section className={cn(styles.surface, styles.nextUnlock)} aria-label={uiText("rewards:next_rank_fcaf80")}>
              <RewardBadge gold={maximumRank} icon={maximumRank ? Trophy : Mountain} className={styles.nextBadge} />
              <div className={styles.nextContent}>
                <Eyebrow>{maximumRank ? uiText("rewards:highest_rank_831c44") : uiText("rewards:next_unlock_50e2c6")}</Eyebrow>
                <h2>{maximumRank ? rankTitle(summary.level, summary.level_title) : uiText("rewards:level_value_value_f7ddae", { value0: uiValue(summary.level + 1), value1: uiValue(rankName(summary.level + 1)) })}</h2>
                <p>{maximumRank ? uiText("rewards:maximum_level_reached_keep_building_your_survival_d4c807") : uiText("rewards:keep_learning_and_earn_value_xp_to_231782", { value0: uiValue(formatXp(summary.xp_to_next_level ?? 0)) })}</p>
              </div>
              {target && (
                <div className={styles.nextProgress}>
                  <p>{uiText("rewards:value_xp_to_go_0c566f", { value0: uiValue(formatXp(summary.xp_to_next_level ?? 0)) })}</p>
                  <ProgressBar value={target.pct} label={uiText("rewards:next_rank_xp_progress_da584a")} />
                  <span>{uiText("rewards:value_value_xp_f7de48", { value0: uiValue(formatXp(summary.total_xp)), value1: uiValue(formatXp(target.total)) })}</span>
                </div>
              )}
            </section>
            <section className={cn(styles.surface, styles.rankRoadmap)} aria-label={uiText("rewards:reward_progression_5044e4")}>
              <div className={styles.roadmapHeading}>
                <h2>{uiText("rewards:reward_progression_026cb6")}</h2>
                <p>{uiText("rewards:your_title_journey_at_survival_academy_8fa598")}</p>
              </div>
              <ol className={styles.ranks}>
                {visibleRanks(summary).map((rank) => {
                  const current = rank.level === summary.level;
                  const reached = rank.level <= summary.level;
                  return (
                    <li key={rank.level} className={cn(styles.rank, current && styles.currentRank, reached && styles.reachedRank)} aria-current={current ? "step" : undefined}>
                      <RewardBadge gold={reached} icon={current ? Mountain : reached ? Check : LockKeyhole} />
                      <span>{uiText("rewards:lvl_value_f2fece", { value0: uiValue(rank.level) })}</span><strong>{rank.title}</strong>
                      <span className="sr-only">{current ? uiText("rewards:current_rank_affa54") : reached ? uiText("rewards:unlocked_b3da70") : uiText("rewards:locked_a79888")}</span>
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>
        </>
      ) : <div className="panel h-44 animate-pulse" role="status"><span className="sr-only">{uiText("rewards:loading_rewards_4da0be")}</span></div>}

      <section className={styles.wall} aria-labelledby="achievements-heading">
        <div className={styles.wallHeading}>
          <div className={styles.wallTitle}><Award aria-hidden="true" /><div><Eyebrow>{uiText("rewards:wall_c4633c")}</Eyebrow><h2 id="achievements-heading">{uiText("rewards:achievements_a6634f")}</h2></div></div>
          {achievements && totalCount > 0 && <div className={styles.wallProgress}><span>{uiText("rewards:value_value_unlocked_79326e", { value0: uiValue(earnedCount), value1: uiValue(totalCount) })}</span><ProgressBar value={unlockedPct} label={uiText("rewards:achievements_unlocked_a50b9d")} /><strong>{unlockedPct}%</strong></div>}
        </div>
        {achievementsQuery.isError ? (
          <ErrorState error={achievementsQuery.error} onRetry={() => void achievementsQuery.refetch()} />
        ) : achievementsQuery.isPending ? (
          <div className={styles.achievementGrid} aria-hidden="true">{[1, 2, 3].map((key) => <div key={key} className="panel-2 h-36 animate-pulse" />)}</div>
        ) : achievements && totalCount === 0 ? (
          <EmptyState title={uiText("rewards:no_achievements_yet_29f3dc")} description={uiText("rewards:your_achievements_will_appear_here_as_you_10e6a6")} />
        ) : achievements ? (
          <div className={styles.achievementGrid}>
            {achievements.earned.map((achievement) => <RewardAchievement key={achievement.achievement_key} achievement={achievement} earned />)}
            {achievements.unearned.map((achievement) => <RewardAchievement key={achievement.achievement_key} achievement={achievement} earned={false} />)}
          </div>
        ) : null}
      </section>

      <section className={styles.ledger}>
        <SectionHeader eyebrow={uiText("rewards:ledger_1aa2f3")} title={uiText("rewards:xp_transactions_019b5d")} />
        {summary && summary.recent_transactions.length > 0 ? (
          <ul className={styles.transactions}>
            {summary.recent_transactions.map((tx, index) => (
              <li key={`${tx.at}-${index}`}><span className={styles.transactionIcon}><Layers size={18} aria-hidden="true" /></span><div><p>{XP_SOURCE_LABELS[tx.source] ?? tx.source.replaceAll("_", " ")}</p><time dateTime={tx.at}>{formatDate(tx.at)}</time></div><strong>{uiText("rewards:valuevalue_xp_5c6278", { value0: uiValue(tx.amount >= 0 ? "+" : ""), value1: uiValue(formatXp(tx.amount)) })}</strong></li>
            ))}
          </ul>
        ) : summary ? <EmptyState title={uiText("rewards:no_xp_earned_yet_7a221f")} description={uiText("rewards:complete_a_lesson_or_take_a_quiz_905392")} /> : null}
      </section>
    </div>
  );
}

function RewardStat({ icon: Icon, medal = false, className, children }: { icon: LucideIcon; medal?: boolean; className?: string; children: ReactNode }) {
  useInterfaceLocale();
  return <div className={cn(styles.stat, className)}>{medal ? <RewardBadge gold icon={Icon} className={styles.statBadge} /> : <span className={styles.statIcon}><Icon aria-hidden="true" /></span>}{children}</div>;
}

type EarnedAchievement = AchievementsResponse["earned"][number];
type LockedAchievement = AchievementsResponse["unearned"][number];
function RewardAchievement({ achievement, earned }: { achievement: EarnedAchievement | LockedAchievement; earned: boolean }) {
  useInterfaceLocale();
  const art = ACHIEVEMENT_ART[achievement.achievement_key] ?? { icon: Award, scene: earned ? earnedScene : forest };
  const progress = "progress" in achievement ? achievement.progress : undefined;
  const earnedAt = "earned_at" in achievement ? achievement.earned_at : undefined;
  return (
    <article className={cn("panel-2", styles.achievement, earned && styles.earnedAchievement)} aria-labelledby={`achievement-${achievement.achievement_key}`}>
      <img src={art.scene} alt="" className={styles.achievementScene} loading="lazy" width={960} height={320} />
      <RewardBadge gold={earned} icon={art.icon} className={styles.achievementBadge} />
      <div className={styles.achievementContent}>
        <span className={cn(styles.lockState, earned && styles.unlockedState)} title={earned ? uiText("rewards:unlocked_b3da70") : uiText("rewards:locked_a79888")}>{earned ? <Check aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}<span className="sr-only">{earned ? uiText("rewards:unlocked_b3da70") : uiText("rewards:locked_a79888")}</span></span>
        <h3 id={`achievement-${achievement.achievement_key}`}>{achievement.title}</h3>
        <p>{achievement.description}</p>
        {!earned && progress !== undefined && <ProgressBar value={progress.pct} label={uiText("rewards:value_progress_8196fd", { value0: uiValue(achievement.title) })} />}
        <p className={styles.achievementStatus}>{earned && earnedAt ? uiText("rewards:earned_value_f5cbb1", { value0: uiValue(formatDate(earnedAt)) }) : uiText("rewards:not_earned_bbf605")}</p>
      </div>
    </article>
  );
}
