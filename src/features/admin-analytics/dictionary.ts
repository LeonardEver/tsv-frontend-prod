/** Typed compatibility adapter. All analytics copy now uses the application's i18next instance. */
import { i18n } from "@/i18n";
import { normalizeLocale } from "@/i18n/config";
import english from "@/i18n/locales/en/admin.json";
import portuguese from "@/i18n/locales/pt-BR/admin.json";
import type { AdminLanguage } from "./language";
export interface Dict {
  /** Compact language switch, in the page header. */
  toggle: {
    label: string;
    english: string;
    portuguese: string;
  };
  /** Page header + tab strip. */
  nav: {
    eyebrow: string;
    title: string;
    description: string;
    sectionsAria: string;
    tab: Record<
      | "overview"
      | "users"
      | "engagement"
      | "learning"
      | "content"
      | "gaps"
      | "stalled"
      | "retention"
      | "community"
      | "gamification"
      | "billing"
      | "geography",
      string
    >;
  };
  /** Access gate: the four honest states of `useAdminAccess`. */
  access: {
    deniedTitle: string;
    deniedDescription: string;
    unreachableTitle: string;
    unreachableDescription: string;
  };
  /** Shared filter bar. */
  filters: {
    range: string;
    presetsAria: string;
    /** Single-day presets are CALENDAR days in the same UTC semantics
     * the rest of the surface already uses — never rolling 24-hour
     * windows. */
    preset: Record<"today" | "yesterday" | "7d" | "30d" | "90d" | "365d", string>;
    allTime: string;
    from: string;
    to: string;
    plan: string;
    allPlans: string;
    planFree: string;
    planSurvivor: string;
    planOperator: string;
    country: string;
    allCountries: string;
    bucket: string;
    granularityDay: string;
    granularityWeek: string;
    granularityMonth: string;
    reset: string;
    /** Heading of the client-side range guard. */
    rangeNotRequested: string;
    rangeInverted: string;
    rangeTooLong: string;
  };
  /** Copy owned by the shared chart/table primitives (`charts.tsx`). */
  charts: {
    noRows: string;
    noBuckets: string;
    notEnoughBuckets: string;
    notYetObservable: string;
    notAvailable: string;
    definitions: string;
    /** The resolved window the server actually used. */
    allTime: string;
    noComparisonPeriod: string;
    noChange: string;
    newlyObserved: string;
    versusPrevious: string;
    /** Screen-reader labels describing a chart's shape. */
    barsAria: string;
    sparkAria: string;
  };
  /** Shared "adjust the range" placeholder and paginated-table controls. */
  common: {
    adjustRange: string;
    adjustRangeLearning: string;
    adjustRangeContent: string;
    adjustRangeGaps: string;
    adjustRangeStalled: string;
    adjustRangeRetention: string;
    loadMore: string;
    loading: string;
  };
  /** Shared error surface (admin wording for the backend's error codes). */
  errors: {
    timeout: string;
    offlineTitle: string;
    offlineDescription: string;
    forbidden: string;
    notFound: string;
    rateLimitedTitle: string;
    rateLimitedWait: string;
    rateLimitedRetryAfter: string;
    genericTitle: string;
    genericDescription: string;
    retry: string;
    reference: string;
  };
  tabs: {
    overview: {
      kpiTotalUsers: string;
      kpiNewUsers: string;
      kpiPayingUsers: string;
      kpiFreeUsers: string;
      kpiTrialUsers: string;
      kpiChurnedUsers: string;
      kpiActiveUsers: string;
      kpiActiveDays: string;
      kpiLessonsCompleted: string;
      kpiQuizSubmissions: string;
      kpiXpAwarded: string;
      hintSignedUpInRange: string;
      hintEffectiveNotFree: string;
      hintCurrentlyTrialing: string;
      hintChurned: string;
      hintLearningActive: string;
      hintAcceptedCompletions: string;
      ratioLessonsPerActive: string;
      ratioLessonsPerActiveHint: string;
      ratioQuizzesPerActive: string;
      ratioQuizzesPerActiveHint: string;
      ratioXpPerActive: string;
      ratioXpPerActiveHint: string;
      ratioActiveDaysPerActive: string;
      ratioActiveDaysPerActiveHint: string;
      keyMetricsTitle: string;
      keyMetricsDescription: string;
      perActiveUserTitle: string;
      perActiveUserDescription: string;
      windowsTitle: string;
      windowsDescription: string;
      dau: string;
      wau: string;
      mau: string;
      dauHint: string;
      wauHint: string;
      mauHint: string;
      unsupportedTitle: string;
      unsupportedDescription: string;
      unsupportedRevenue: string;
      unsupportedPlanChanges: string;
      unsupportedVisitDau: string;
    };
    users: {
      kpiTotalUsers: string;
      kpiNewUsers: string;
      kpiPayingUsers: string;
      kpiFreeUsers: string;
      kpiChurnedUsers: string;
      hintSignedUpInRange: string;
      hintEffectiveNotFree: string;
      hintEffectiveFree: string;
      hintChurned: string;
      colPlan: string;
      colUsers: string;
      colShareOfUsers: string;
      colActiveUsers: string;
      colActiveRate: string;
      colTrialUsers: string;
      colLessonsCompleted: string;
      colDistinctLessons: string;
      colQuizSubmissions: string;
      colActiveDays: string;
      colXpAwarded: string;
      colLessonsPerActive: string;
      colXpPerActive: string;
      colCountry: string;
      colPayingUsers: string;
      keyMetricsTitle: string;
      keyMetricsDescription: string;
      newUsersTitle: string;
      newUsersDescription: string;
      newUsersAria: string;
      planBreakdownTitle: string;
      planBreakdownDescription: string;
      planBreakdownCaption: string;
      planBreakdownEmpty: string;
      statusTitle: string;
      statusDescription: string;
      statusAria: string;
      topCountriesTitle: string;
      topCountriesDescription: string;
      topCountriesCaption: string;
      topCountriesEmpty: string;
    };
    engagement: {
      counterActiveUsers: string;
      counterLessonCompletions: string;
      counterQuizSubmissions: string;
      counterLessonStarts: string;
      counterCompletionEvents: string;
      counterQuizzesStarted: string;
      counterQuizzesCompleted: string;
      counterDownloads: string;
      counterPosts: string;
      counterComments: string;
      counterVotes: string;
      counterXpAwarded: string;
      trendCommunityPosts: string;
      activeUsersTitle: string;
      activeUsersDescription: string;
      kpiLearningActiveUsers: string;
      kpiLearningActiveHint: string;
      kpiCommunityActiveUsers: string;
      kpiCommunityActiveHint: string;
      activityTotalsTitle: string;
      activityTotalsDescription: string;
      kpiActiveDays: string;
      kpiActiveDaysHint: string;
      kpiLessonsCompleted: string;
      kpiLessonsCompletedHint: string;
      kpiQuizSubmissions: string;
      windowsTitle: string;
      windowsDescription: string;
      dau: string;
      wau: string;
      mau: string;
      dauHint: string;
      wauHint: string;
      mauHint: string;
      byBucketTitle: string;
      byBucketDescription: string;
      activePerBucketAria: string;
      trendPerBucketAria: string;
      allCountersTitle: string;
      allCountersDescription: string;
      allCountersCaption: string;
      allCountersEmpty: string;
      lessonStartsNote: string;
    };
    learning: {
      stage: Record<
        | "users"
        | "lesson_started"
        | "lesson_completed"
        | "quiz_started"
        | "quiz_submitted"
        | "quiz_passed"
        | "module_progressed",
        string
      >;
      colPlan: string;
      colStarted: string;
      colCompleted: string;
      usersCount: string;
      ofAllUsers: string;
      fromPrevious: string;
      dropOff: string;
      stagesTitle: string;
      stagesDescription: string;
      notNestedLabel: string;
      byPlanTitle: string;
      byPlanDescription: string;
      byPlanCaption: string;
      byPlanEmpty: string;
    };
    content: {
      colLesson: string;
      colModule: string;
      colCategory: string;
      colDifficulty: string;
      /** The backend's difficulty enum, in display form. Anything outside
       * it is shown exactly as sent. */
      knownDifficulty: Record<"beginner" | "intermediate" | "advanced", string>;
      colEstMinutes: string;
      colUsersStarted: string;
      colUsersCompleted: string;
      colCompletionRate: string;
      colUsersStalled: string;
      colAvgSeconds: string;
      colDurationSample: string;
      colLessons: string;
      colQuizAttempts: string;
      colQuizPassRate: string;
      colQuizAvgScore: string;
      colQuiz: string;
      colPassingScore: string;
      colUniqueUsers: string;
      colAttempts: string;
      colPassRate: string;
      colFirstAttemptPassRate: string;
      colAvgScore: string;
      colAttemptsPerUser: string;
      type: string;
      typeLesson: string;
      typeModule: string;
      typeQuiz: string;
      searchTitle: string;
      searchPlaceholder: string;
      search: string;
      sortBy: string;
      sort: Record<"lesson" | "module" | "quiz", Record<string, string>>;
      defaultOrder: string;
      title: string;
      description: string;
      captionLesson: string;
      captionModule: string;
      captionQuiz: string;
      emptyLesson: string;
      emptyModule: string;
      emptyQuiz: string;
      /** Caption for the rows currently on screen. */
      rowsLabel: {
        perPage: string;
        matching: string;
      };
    };
    gaps: {
      colObjective: string;
      colTaughtIn: string;
      colCategory: string;
      colAnswers: string;
      colCorrect: string;
      colAccuracy: string;
      colUsers: string;
      colQuestion: string;
      colDifficulty: string;
      colAskedIn: string;
      colKnowledgeItem: string;
      weakestObjectivesTitle: string;
      weakestQuestionsTitle: string;
      weakestItemsTitle: string;
      lowestAccuracyFirst: string;
      minAnswers: string;
      rowsPerList: string;
      floorInEffect: string;
      objectivesCaption: string;
      objectivesEmpty: string;
      questionsCaption: string;
      questionsEmpty: string;
      itemsCaption: string;
      itemsEmpty: string;
    };
    stalled: {
      signalOpenedLessons: string;
      signalInactive: string;
      signalSingleSession: string;
      signalQuizzesWithoutProgress: string;
      colUser: string;
      colPlan: string;
      colSignedUp: string;
      colLastActivity: string;
      daysStalled: string;
      colLastProgress: string;
      colLessons: string;
      colQuizAttempts: string;
      colActiveDays: string;
      colUnansweredStarts: string;
      colLastKnownPosition: string;
      colSignals: string;
      noneFlagged: string;
      title: string;
      description: string;
      daysStalledControl: string;
      caption: string;
      empty: string;
      kpiMinDaysStalled: string;
      kpiMinAccountAge: string;
      definitionLabel: string;
      notMeasurableLabel: string;
      activitySourceLabel: string;
    };
    retention: {
      cohortDay: string;
      cohortWeek: string;
      cohortMonth: string;
      colCohort: string;
      colSize: string;
      colObservable: string;
      observableDay: string;
      usersCount: string;
      title: string;
      description: string;
      cohortBy: string;
      cohorts: string;
      caption: string;
      empty: string;
    };
    community: {
      colBucket: string;
      colPosts: string;
      colComments: string;
      colVotes: string;
      colPlan: string;
      colAuthors: string;
      activityTitle: string;
      activityDescription: string;
      kpiPosts: string;
      kpiComments: string;
      kpiVotes: string;
      kpiVotesHint: string;
      kpiReports: string;
      kpiReportsHint: string;
      kpiActiveUsers: string;
      kpiActiveUsersHint: string;
      authorsTitle: string;
      authorsDescription: string;
      kpiPostAuthors: string;
      kpiCommentAuthors: string;
      kpiVoteAuthors: string;
      distinctPeople: string;
      byBucketTitle: string;
      byBucketDescription: string;
      byBucketAria: string;
      byBucketCaption: string;
      byBucketEmpty: string;
      byPlanTitle: string;
      byPlanDescription: string;
      byPlanAria: string;
      byPlanCaption: string;
      byPlanEmpty: string;
    };
    gamification: {
      colBucket: string;
      colXpAwarded: string;
      colUsersAwarded: string;
      colAchievement: string;
      colKey: string;
      colUnlocks: string;
      xpTitle: string;
      xpDescription: string;
      kpiXpAwarded: string;
      kpiXpAwardedHint: string;
      kpiXpPerActive: string;
      kpiXpPerActiveHint: string;
      xpPerBucketAria: string;
      xpCaption: string;
      xpEmpty: string;
      streaksTitle: string;
      streaksDescription: string;
      kpiUsersWithStreak: string;
      kpiUsersWithStreakHint: string;
      kpiAvgCurrentStreak: string;
      kpiAvgLongestStreak: string;
      kpiMaxCurrentStreak: string;
      kpiMaxLongestStreak: string;
      kpiStreakRows: string;
      kpiStreakRowsHint: string;
      distributionLabel: string;
      distributionAria: string;
      achievementsTitle: string;
      achievementsDescription: string;
      achievementsDescriptionEmpty: string;
      nothingCanUnlock: string;
      achievementsFallback: string;
      kpiUnlockedInRange: string;
      kpiUsersWithUnlocks: string;
      kpiUsersWithUnlocksHint: string;
      kpiDefinedAchievements: string;
      kpiDefinedAchievementsHint: string;
      achievementsCaption: string;
      achievementsEmpty: string;
    };
    billing: {
      colPlanCode: string;
      colSubscriptionRows: string;
      colStatus: string;
      effectiveTitle: string;
      effectiveDescription: string;
      kpiPayingUsers: string;
      kpiPayingUsersHint: string;
      kpiFreeUsers: string;
      kpiFreeUsersHint: string;
      kpiTrialUsers: string;
      kpiTrialUsersHint: string;
      kpiChurnedUsers: string;
      kpiChurnedUsersHint: string;
      movementTitle: string;
      movementDescription: string;
      kpiNewSubscriptions: string;
      kpiNewSubscriptionsHint: string;
      kpiCancellations: string;
      kpiCancellationsHint: string;
      kpiTrials: string;
      kpiTrialsHint: string;
      newSubscriptions: string;
      newSubscriptionsAria: string;
      cancellations: string;
      cancellationsAria: string;
      planCodeTitle: string;
      planCodeDescription: string;
      planCodeCaption: string;
      planCodeEmpty: string;
      totalRows: string;
      statusTitle: string;
      statusDescription: string;
      statusCaption: string;
      statusEmpty: string;
      unsupportedTitle: string;
      unsupportedDescription: string;
      unsupportedRevenue: string;
      unsupportedPlanChanges: string;
    };
    geography: {
      colCountry: string;
      colUsers: string;
      colShare: string;
      colActiveUsers: string;
      colActiveRate: string;
      colPayingUsers: string;
      colPayingRate: string;
      colTrialUsers: string;
      coverageTitle: string;
      coverageDescription: string;
      countries: string;
      kpiUsersWithCountry: string;
      kpiUsersWithCountryHint: string;
      kpiUsersWithoutCountry: string;
      kpiUsersWithoutCountryHint: string;
      kpiCoverage: string;
      kpiCoverageHint: string;
      coverageNote: string;
      byCountryTitle: string;
      byCountryDescription: string;
      byCountryAria: string;
      breakdownTitle: string;
      breakdownDescription: string;
      breakdownCaption: string;
      breakdownEmpty: string;
    };
  };
}


i18n.addResourceBundle("pt-BR", "admin", portuguese, true, true);
// Legacy structural contract remains available to existing audit tests.
function tree(entries: Record<string, string>): Dict {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(entries)) {
    const parts = key.split("."); let node = result;
    for (const part of parts.slice(0, -1)) { node[part] ??= {}; node = node[part] as Record<string, unknown>; }
    node[parts.at(-1) ?? key] = value;
  }
  return result as unknown as Dict;
}
export const STRINGS = { en: tree(english), pt: tree(portuguese) };
function lookup(language: AdminLanguage, key: string): unknown {
  const locale = language === "pt" ? "pt-BR" : normalizeLocale(language) ?? "en";
  return i18n.getResource(locale, "admin", key) ?? i18n.getResource("en", "admin", key);
}
export function translate(language: AdminLanguage, key: string): string {
  const value = lookup(language, key);
  return typeof value === "string" ? value : key;
}
export function interpolate(language: AdminLanguage, key: string, params: Readonly<Record<string, number | string>>): string {
  const template = lookup(language, key);
  if (typeof template !== "string") throw new Error('admin-analytics i18n: "' + key + '" is not an interpolated string');
  return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => {
    const value = params[name];
    if (value === undefined) throw new Error('admin-analytics i18n: "' + key + '" is missing the "{{' + name + '}}" value');
    return String(value);
  });
}
