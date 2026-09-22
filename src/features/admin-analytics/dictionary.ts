/**
 * Admin Product Analytics — the local translation dictionary.
 *
 * Scope rule, and the reason this file exists at all: ONLY static,
 * frontend-owned copy on `/admin/analytics/*`. Nothing here touches the
 * API. Backend strings (analytics `notes`, `limitations.*.reason`,
 * `thresholds.*`, `definition.*`, the `range` echo) are rendered verbatim
 * in both languages — paraphrasing the backend's explanation of why a
 * metric cannot be computed would turn a data limitation into what looks
 * like a UI gap.
 *
 * The English entries are the current production copy, moved here
 * unchanged: with the toggle on English the surface renders exactly what
 * it rendered before.
 *
 * `Dict` is the structural contract; `STRINGS` is keyed by language, so a
 * missing or misspelled Portuguese key is a COMPILE error rather than a
 * blank label at runtime.
 *
 * Entries whose copy interpolates a value carry `{{name}}` placeholders and
 * are filled by `tf(key, { name: value })`. Placeholders rather than
 * functions: an interpolated string stays plain data, so the dictionary can
 * be diffed, and the word order belongs to the translation rather than to
 * the render site.
 */
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

const en: Dict = {
  toggle: {
    label: "Language",
    english: "English",
    portuguese: "Portuguese",
  },
  nav: {
    eyebrow: "Admin",
    title: "Product analytics",
    description:
      "Operational metrics for Survival Academy, read straight from the backend analytics API. Every figure is server-computed; definitions and known limitations are shown alongside the numbers.",
    sectionsAria: "Analytics sections",
    tab: {
      overview: "Overview",
      users: "Users",
      engagement: "Engagement",
      learning: "Funnel",
      content: "Content",
      gaps: "Knowledge gaps",
      stalled: "Stalled",
      retention: "Retention",
      community: "Community",
      gamification: "Gamification",
      billing: "Billing",
      geography: "Geography",
    },
  },
  access: {
    deniedTitle: "Admin access required",
    deniedDescription:
      "This surface is restricted to administrators. Your account doesn't have the admin role.",
    unreachableTitle: "Couldn't verify admin access",
    unreachableDescription:
      "The analytics API couldn't be reached, so access could not be confirmed. Reload the page to try again.",
  },
  filters: {
    range: "Range",
    presetsAria: "Date range presets",
    preset: {
      today: "Today",
      yesterday: "Yesterday",
      "7d": "7d",
      "30d": "30d",
      "90d": "90d",
      "365d": "12mo",
    },
    allTime: "All time",
    from: "From",
    to: "To",
    plan: "Plan",
    allPlans: "All plans",
    planFree: "Free",
    planSurvivor: "Survivor",
    planOperator: "Operator",
    country: "Country",
    allCountries: "All countries",
    bucket: "Bucket",
    granularityDay: "Daily",
    granularityWeek: "Weekly",
    granularityMonth: "Monthly",
    reset: "Reset",
    rangeNotRequested: "Range not requested ·",
    rangeInverted: "The start date is after the end date.",
    rangeTooLong: "This window is {{days}} days. Series endpoints accept at most {{maxDays}} days — narrow the range or pick a shorter preset.",
  },
  charts: {
    noRows: "No rows in this range.",
    noBuckets: "No buckets in this range.",
    notEnoughBuckets: "Not enough buckets to trend.",
    notYetObservable: "not yet observable",
    notAvailable: "Not available",
    definitions: "Definitions & caveats",
    allTime: "All time",
    noComparisonPeriod: "No comparison period",
    noChange: "No change (0 before)",
    newlyObserved: "New (0 → {{current}})",
    versusPrevious: "{{pct}} vs previous ({{previous}})",
    barsAria: "{{base}}. {{buckets}} buckets. Peak {{peak}} at {{peakLabel}}.",
    sparkAria: "{{base}}. {{buckets}} buckets, low {{low}}, high {{high}}.",
  },
  common: {
    adjustRange: "Adjust the date range above to load these metrics.",
    adjustRangeLearning: "Adjust the date range above to load the learning stages.",
    adjustRangeContent: "Adjust the date range above to load content performance.",
    adjustRangeGaps: "Adjust the date range above to load the knowledge gaps.",
    adjustRangeStalled: "Adjust the date range above to load stalled users.",
    adjustRangeRetention: "Adjust the date range above to load retention cohorts.",
    loadMore: "Load more",
    loading: "Loading…",
  },
  errors: {
    timeout: "The server took too long to respond.",
    offlineTitle: "You appear to be offline.",
    offlineDescription: "Check your connection and try again.",
    forbidden: "You don't have access to this content.",
    notFound: "This content isn't available.",
    rateLimitedTitle: "Too many requests.",
    rateLimitedWait: "Please wait a moment and try again.",
    rateLimitedRetryAfter: "Try again in about {{seconds}} seconds.",
    genericTitle: "Something went wrong.",
    genericDescription: "Please try again.",
    retry: "Retry",
    reference: "Reference:",
  },
  tabs: {
    overview: {
      kpiTotalUsers: "Total users",
      kpiNewUsers: "New users",
      kpiPayingUsers: "Paying users",
      kpiFreeUsers: "Free users",
      kpiTrialUsers: "Trial users",
      kpiChurnedUsers: "Churned users",
      kpiActiveUsers: "Active users",
      kpiActiveDays: "Active days",
      kpiLessonsCompleted: "Lessons completed",
      kpiQuizSubmissions: "Quiz submissions",
      kpiXpAwarded: "XP awarded",
      hintSignedUpInRange: "Signed up in range",
      hintEffectiveNotFree: "Effective plan ≠ free",
      hintCurrentlyTrialing: "Currently trialing",
      hintChurned: "Non-free plan on file, effective free now",
      hintLearningActive: "Learning-active, not visits",
      hintAcceptedCompletions: "Accepted, not retry-inflated",
      ratioLessonsPerActive: "Lessons / active user",
      ratioLessonsPerActiveHint: "Lessons completed ÷ active users",
      ratioQuizzesPerActive: "Quiz submissions / active user",
      ratioQuizzesPerActiveHint: "Submissions ÷ active users",
      ratioXpPerActive: "XP / active user",
      ratioXpPerActiveHint: "Awarded XP ÷ active users (retries inflate)",
      ratioActiveDaysPerActive: "Active days / active user",
      ratioActiveDaysPerActiveHint: "Sessions of learning per active user",
      keyMetricsTitle: "Key metrics",
      keyMetricsDescription:
        "Totals for the selected window, with the equivalent figure from the preceding window of equal length.",
      perActiveUserTitle: "Per active user",
      perActiveUserDescription:
        "Averages across the users who were learning-active in range — the backend's ratio precision is two decimals.",
      windowsTitle: "Activity windows",
      windowsDescription: "Measured as of the end of the selected range.",
      dau: "DAU",
      wau: "WAU",
      mau: "MAU",
      dauHint: "Active on the final day",
      wauHint: "Active in the trailing 7 days",
      mauHint: "Active in the trailing 30 days",
      unsupportedTitle: "Not measurable from this database",
      unsupportedDescription:
        "The backend reports these as unsupported rather than approximating them.",
      unsupportedRevenue: "Revenue / MRR / ARR",
      unsupportedPlanChanges: "Upgrades & downgrades",
      unsupportedVisitDau: "Visit-based DAU",
    },
    users: {
      kpiTotalUsers: "Total users",
      kpiNewUsers: "New users",
      kpiPayingUsers: "Paying users",
      kpiFreeUsers: "Free users",
      kpiChurnedUsers: "Churned users",
      hintSignedUpInRange: "Signed up in range",
      hintEffectiveNotFree: "Effective plan ≠ free",
      hintEffectiveFree: "Effective plan is free",
      hintChurned: "Non-free plan on file, effective free now",
      colPlan: "Plan",
      colUsers: "Users",
      colShareOfUsers: "Share of users",
      colActiveUsers: "Active users",
      colActiveRate: "Active rate",
      colTrialUsers: "Trial users",
      colLessonsCompleted: "Lessons completed",
      colDistinctLessons: "Distinct lessons",
      colQuizSubmissions: "Quiz submissions",
      colActiveDays: "Active days",
      colXpAwarded: "XP awarded",
      colLessonsPerActive: "Lessons / active user",
      colXpPerActive: "XP / active user",
      colCountry: "Country",
      colPayingUsers: "Paying users",
      keyMetricsTitle: "Key metrics",
      keyMetricsDescription: "Who the platform holds, as of the end of the selected window.",
      newUsersTitle: "New users",
      newUsersDescription: "Signups per bucket across the selected window.",
      newUsersAria: "New users per bucket",
      planBreakdownTitle: "Plan breakdown",
      planBreakdownDescription:
        "Always three rows — one per plan code, zero-filled. Lessons completed counts accepted completions in range; distinct lessons counts distinct lessons from progress rows.",
      planBreakdownCaption: "Users by effective plan",
      planBreakdownEmpty: "No plan rows in this range.",
      statusTitle: "Subscription status",
      statusDescription:
        "The stored status on each subscription row — the input the effective-plan rules read, not their output. Users with no subscription row at all are absent here.",
      statusAria: "Users by subscription status",
      topCountriesTitle: "Top countries",
      topCountriesDescription:
        "Ranked by users. The server caps this list at 20 rows, so it is the head of the distribution and not the whole of it.",
      topCountriesCaption: "Top countries by users",
      topCountriesEmpty: "No country rows in this range.",
    },
    engagement: {
      counterActiveUsers: "Active users",
      counterLessonCompletions: "Lessons completed",
      counterQuizSubmissions: "Quiz submissions",
      counterLessonStarts: "Lesson starts",
      counterCompletionEvents: "Completion events",
      counterQuizzesStarted: "Quizzes started",
      counterQuizzesCompleted: "Quizzes completed",
      counterDownloads: "Downloads",
      counterPosts: "Posts",
      counterComments: "Comments",
      counterVotes: "Votes",
      counterXpAwarded: "XP awarded",
      trendCommunityPosts: "Community posts",
      activeUsersTitle: "Active users",
      activeUsersDescription:
        "Two different populations, counted independently. They overlap, so the two figures are not added together.",
      kpiLearningActiveUsers: "Learning-active users",
      kpiLearningActiveHint: "Completed a lesson or submitted a quiz",
      kpiCommunityActiveUsers: "Community-active users",
      kpiCommunityActiveHint: "Posted, commented or voted",
      activityTotalsTitle: "Activity totals",
      activityTotalsDescription:
        "Totals for the selected window. All three come from learning activity — none of them describe the community.",
      kpiActiveDays: "Active days",
      kpiActiveDaysHint: "User-days with learning activity",
      kpiLessonsCompleted: "Lessons completed",
      kpiLessonsCompletedHint: "Accepted completions, not retry-inflated",
      kpiQuizSubmissions: "Quiz submissions",
      windowsTitle: "Activity windows",
      windowsDescription: "Measured as of the end of the selected range.",
      dau: "DAU",
      wau: "WAU",
      mau: "MAU",
      dauHint: "Active on the final day",
      wauHint: "Active in the trailing 7 days",
      mauHint: "Active in the trailing 30 days",
      byBucketTitle: "Activity by bucket",
      byBucketDescription:
        "Active users in each bucket of the range, with the most-used counters trending beneath. A bucket with no activity is drawn as a faint stub, not as a gap.",
      activePerBucketAria: "Active users per {{granularity}}",
      trendPerBucketAria: "{{label}} per bucket",
      allCountersTitle: "Every counter, per bucket",
      allCountersDescription:
        "All thirteen counters for every bucket, exactly as returned — including the ones the trends above do not chart.",
      allCountersCaption: "Engagement counters per bucket",
      allCountersEmpty: "No buckets in this range.",
      lessonStartsNote:
        "Lesson starts are recorded only from the date the lesson-start instrumentation shipped — buckets before that undercount them.",
    },
    learning: {
      stage: {
        users: "All users in range",
        lesson_started: "Started a lesson",
        lesson_completed: "Completed a lesson",
        quiz_started: "Started a quiz",
        quiz_submitted: "Submitted a quiz",
        quiz_passed: "Passed a quiz",
        module_progressed: "Progressed a module",
      },
      colPlan: "Plan",
      colStarted: "Started a lesson",
      colCompleted: "Completed a lesson",
      usersCount: "{{count}} users",
      ofAllUsers: "{{pct}} of all users in range",
      fromPrevious: "From previous:",
      dropOff: "Drop-off:",
      stagesTitle: "Learning stages",
      stagesDescription:
        "Distinct users who performed each action in the selected window, drawn on one shared scale.",
      notNestedLabel: "Stages are not nested",
      byPlanTitle: "Started vs completed, by plan",
      byPlanDescription: "The two lesson stages split by the user's effective plan.",
      byPlanCaption: "Lesson starts and completions by plan",
      byPlanEmpty: "No plan rows in this range.",
    },
    content: {
      colLesson: "Lesson",
      colModule: "Module",
      colCategory: "Category",
      colDifficulty: "Difficulty",
      knownDifficulty: { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" },
      colEstMinutes: "Est. minutes",
      colUsersStarted: "Users started",
      colUsersCompleted: "Users completed",
      colCompletionRate: "Completion rate",
      colUsersStalled: "Users stalled",
      colAvgSeconds: "Avg seconds to complete",
      colDurationSample: "Duration sample",
      colLessons: "Lessons",
      colQuizAttempts: "Quiz attempts",
      colQuizPassRate: "Quiz pass rate",
      colQuizAvgScore: "Quiz avg score (0–100)",
      colQuiz: "Quiz",
      colPassingScore: "Passing score (0–1)",
      colUniqueUsers: "Unique users",
      colAttempts: "Attempts",
      colPassRate: "Pass rate",
      colFirstAttemptPassRate: "First-attempt pass rate",
      colAvgScore: "Avg score (0–100)",
      colAttemptsPerUser: "Attempts / user",
      type: "Type",
      typeLesson: "Lessons",
      typeModule: "Modules",
      typeQuiz: "Quizzes",
      searchTitle: "Search title",
      searchPlaceholder: "Lesson or module title",
      search: "Search",
      sortBy: "Sort by",
      sort: {
        lesson: {
          default: "Most started (default)",
          mostCompleted: "Most completed",
          lowestCompletion: "Lowest completion rate",
          mostStalled: "Most stalled users",
          longestEstimated: "Longest estimated",
          title: "Title (A–Z)",
        },
        module: {
          default: "Most started (default)",
          mostCompleted: "Most completed",
          lowestCompletion: "Lowest completion rate",
          mostAttempts: "Most quiz attempts",
          lowestQuizPass: "Lowest quiz pass rate",
          title: "Title (A–Z)",
        },
        quiz: {
          default: "Most attempts (default)",
          mostUsers: "Most users",
          lowestPass: "Lowest pass rate",
          lowestFirstPass: "Lowest first-attempt pass rate",
          lowestScore: "Lowest average score",
          title: "Title (A–Z)",
        },
      },
      defaultOrder: "backend default order",
      title: "Content performance",
      description:
        "One row shape per type: lessons, modules and quizzes each get their own table, sort vocabulary and columns.",
      captionLesson: "Lesson performance in range",
      captionModule: "Module performance in range",
      captionQuiz: "Quiz performance in range",
      emptyLesson: "No lessons match this view.",
      emptyModule: "No modules match this view.",
      emptyQuiz: "No quizzes match this view.",
      rowsLabel: {
        perPage: "{{pageSize}} lessons per page",
        matching: "lessons matching \"{{query}}\", {{pageSize}} per page",
      },
    },
    gaps: {
      colObjective: "Learning objective",
      colTaughtIn: "Taught in",
      colCategory: "Category",
      colAnswers: "Answers",
      colCorrect: "Correct",
      colAccuracy: "Accuracy",
      colUsers: "Users",
      colQuestion: "Question",
      colDifficulty: "Difficulty",
      colAskedIn: "Asked in",
      colKnowledgeItem: "Knowledge item",
      weakestObjectivesTitle: "Weakest objectives",
      weakestQuestionsTitle: "Weakest questions",
      weakestItemsTitle: "Weakest knowledge items",
      lowestAccuracyFirst: "Lowest accuracy first, exactly as the backend orders them.",
      minAnswers: "Min answers",
      rowsPerList: "Rows per list",
      floorInEffect: "Floor in effect: {{floor}} answers per row.",
      objectivesCaption: "Weakest learning objectives by accuracy",
      objectivesEmpty: "No objective clears the sample floor in this range.",
      questionsCaption: "Weakest quiz questions by accuracy",
      questionsEmpty: "No question clears the sample floor in this range.",
      itemsCaption: "Weakest knowledge items by accuracy",
      itemsEmpty: "No knowledge item clears the sample floor in this range.",
    },
    stalled: {
      signalOpenedLessons: "opened lessons, never completed",
      signalInactive: "inactive 30+ days",
      signalSingleSession: "single-session user",
      signalQuizzesWithoutProgress: "quizzes without lesson progress",
      colUser: "User",
      colPlan: "Plan",
      colSignedUp: "Signed up",
      colLastActivity: "Last activity",
      daysStalled: "{{days}} days stalled",
      colLastProgress: "Last progress",
      colLessons: "Lessons",
      colQuizAttempts: "Quiz attempts",
      colActiveDays: "Active days",
      colUnansweredStarts: "Unanswered starts",
      colLastKnownPosition: "Last known position",
      colSignals: "Signals",
      noneFlagged: "none flagged",
      title: "Stalled users",
      description:
        "Most-stalled first. This list is the API's only PII surface: name and email are returned so it can be worked as an outreach queue.",
      daysStalledControl: "Days stalled",
      caption: "Stalled users, most stalled first",
      empty: "No user matches this threshold in the selected window.",
      kpiMinDaysStalled: "Min days stalled",
      kpiMinAccountAge: "Min account age (days)",
      definitionLabel: "Definition",
      notMeasurableLabel: "Not measurable",
      activitySourceLabel: "Activity source ·",
    },
    retention: {
      cohortDay: "Daily cohorts",
      cohortWeek: "Weekly cohorts",
      cohortMonth: "Monthly cohorts",
      colCohort: "Cohort",
      colSize: "Size",
      colObservable: "Observable",
      observableDay: "day {{day}}",
      usersCount: "{{count}} users",
      title: "Signup cohorts",
      description: "Share of each signup cohort that came back to learn on day 1, 7, 14 and 30.",
      cohortBy: "Cohort by",
      cohorts: "Cohorts",
      caption: "Retention by signup cohort",
      empty: "No cohorts in this range.",
    },
    community: {
      colBucket: "Bucket",
      colPosts: "Posts",
      colComments: "Comments",
      colVotes: "Votes",
      colPlan: "Plan",
      colAuthors: "Authors",
      activityTitle: "Community activity",
      activityDescription:
        "Row counts for every action in range — one row per event, not one per person.",
      kpiPosts: "Posts",
      kpiComments: "Comments",
      kpiVotes: "Votes",
      kpiVotesHint: "Upvote only",
      kpiReports: "Reports",
      kpiReportsHint: "Unique per reporter and target",
      kpiActiveUsers: "Active users",
      kpiActiveUsersHint: "Posted, commented or voted",
      authorsTitle: "Distinct authors",
      authorsDescription:
        "People, not rows. Someone who posted five times is one author here and five posts in the panel above.",
      kpiPostAuthors: "Post authors",
      kpiCommentAuthors: "Comment authors",
      kpiVoteAuthors: "Vote authors",
      distinctPeople: "Distinct people",
      byBucketTitle: "Posts by bucket",
      byBucketDescription:
        "Posts created in each bucket of the range, with the comments and votes recorded alongside them.",
      byBucketAria: "Community posts per bucket",
      byBucketCaption: "Community rows per bucket",
      byBucketEmpty: "No buckets in this range.",
      byPlanTitle: "By plan",
      byPlanDescription:
        "Posts and comments attributed to the plan of their author. Votes are not broken down by plan.",
      byPlanAria: "Posts per plan",
      byPlanCaption: "Community activity by plan",
      byPlanEmpty: "No plans to break down for this range.",
    },
    gamification: {
      colBucket: "Bucket",
      colXpAwarded: "XP awarded",
      colUsersAwarded: "Users awarded",
      colAchievement: "Achievement",
      colKey: "Key",
      colUnlocks: "Unlocks",
      xpTitle: "XP",
      xpDescription: "Every XP transaction in the window, summed per bucket.",
      kpiXpAwarded: "XP awarded",
      kpiXpAwardedHint: "Awarded amounts — retries can re-award",
      kpiXpPerActive: "XP / active user",
      kpiXpPerActiveHint: "Awarded XP ÷ users active in the trailing 30 days",
      xpPerBucketAria: "XP awarded per bucket",
      xpCaption: "XP awarded per bucket",
      xpEmpty: "No XP was awarded in this range.",
      streaksTitle: "Streaks",
      streaksDescription:
        "Streak lengths are day counts. The distribution below draws only the lengths that have users — a length nobody is on has no bar, rather than a bar at zero.",
      kpiUsersWithStreak: "Users with a streak",
      kpiUsersWithStreakHint: "Current streak above zero",
      kpiAvgCurrentStreak: "Avg current streak",
      kpiAvgLongestStreak: "Avg longest streak",
      kpiMaxCurrentStreak: "Max current streak",
      kpiMaxLongestStreak: "Max longest streak",
      kpiStreakRows: "Streak rows",
      kpiStreakRowsHint: "Not an engagement signal",
      distributionLabel: "Users by current streak length",
      distributionAria: "Users by current streak length, in days",
      achievementsTitle: "Achievements",
      achievementsDescription:
        "Unlocks recorded in range, and the definition catalogue they come from.",
      achievementsDescriptionEmpty:
        "The backend reports no achievement definitions in this database.",
      nothingCanUnlock: "Nothing can unlock",
      achievementsFallback:
        "No achievement definitions have been seeded in this database, so no achievement can unlock.",
      kpiUnlockedInRange: "Unlocked in range",
      kpiUsersWithUnlocks: "Users with unlocks",
      kpiUsersWithUnlocksHint: "Distinct people",
      kpiDefinedAchievements: "Defined achievements",
      kpiDefinedAchievementsHint: "Available to unlock",
      achievementsCaption: "Most-unlocked achievements in range",
      achievementsEmpty: "No achievements were unlocked in this range.",
    },
    billing: {
      colPlanCode: "Plan code on file",
      colSubscriptionRows: "Subscription rows",
      colStatus: "Status",
      effectiveTitle: "Effective plans",
      effectiveDescription:
        "What each user's plan resolves to right now, after the stored status and period rules are applied — the plan the entitlement checks see.",
      kpiPayingUsers: "Paying users",
      kpiPayingUsersHint: "Effective plan ≠ free",
      kpiFreeUsers: "Free users",
      kpiFreeUsersHint: "Effective plan is free",
      kpiTrialUsers: "Trial users",
      kpiTrialUsersHint: "Currently trialing",
      kpiChurnedUsers: "Churned users",
      kpiChurnedUsersHint: "Non-free plan on file, effective free now",
      movementTitle: "Subscription movement",
      movementDescription:
        "Subscriptions created and cancelled in the selected window, and the ones trialing now.",
      kpiNewSubscriptions: "New subscriptions",
      kpiNewSubscriptionsHint: "Created in range",
      kpiCancellations: "Cancellations",
      kpiCancellationsHint: "Cancelled in range",
      kpiTrials: "Trials",
      kpiTrialsHint:
        "Currently trialing whose period began in range — not trials started",
      newSubscriptions: "New subscriptions",
      newSubscriptionsAria: "New subscriptions per bucket",
      cancellations: "Cancellations",
      cancellationsAria: "Cancellations per bucket",
      planCodeTitle: "Plan code on file",
      planCodeDescription:
        "Every subscription row grouped by its stored subscriptions.plan_code — raw state, before the effective-plan rules are applied. A cancelled or unpaid subscription still carries its stored code here, so this view differs from the effective-plan tiles above.",
      planCodeCaption: "Subscription rows by stored plan code",
      planCodeEmpty: "No subscription rows.",
      totalRows: "{{count}} subscription rows in total across these plans.",
      statusTitle: "Subscription status",
      statusDescription:
        "The stored status behind each subscription row — the input the effective-plan rules read, not their output.",
      statusCaption: "Subscription rows by status",
      statusEmpty: "No subscription rows.",
      unsupportedTitle: "Not measurable from this database",
      unsupportedDescription:
        "The backend reports these as unsupported rather than approximating them.",
      unsupportedRevenue: "Revenue / MRR / ARR",
      unsupportedPlanChanges: "Upgrades & downgrades",
    },
    geography: {
      colCountry: "Country",
      colUsers: "Users",
      colShare: "Share",
      colActiveUsers: "Active users",
      colActiveRate: "Active rate",
      colPayingUsers: "Paying users",
      colPayingRate: "Paying rate",
      colTrialUsers: "Trial users",
      coverageTitle: "Coverage",
      coverageDescription:
        "Country is the value a user declared on their profile, validated as an ISO code on write — not where they connected from.",
      countries: "Countries",
      kpiUsersWithCountry: "Users with a country",
      kpiUsersWithCountryHint: "Declared on their profile",
      kpiUsersWithoutCountry: "Users without a country",
      kpiUsersWithoutCountryHint: "Not required at signup",
      kpiCoverage: "Coverage",
      kpiCoverageHint: "Share of users with a country",
      coverageNote:
        "Coverage below 100% means the remaining users have no country on file — unknown, not zero. Every percentage in the table below is of users WITH a country, so those users sit outside the denominator.",
      byCountryTitle: "Users by country",
      byCountryDescription:
        "The returned rows in rank order — one bar per country, the same order the table below uses.",
      byCountryAria: "Users by country",
      breakdownTitle: "Country breakdown",
      breakdownDescription:
        "One row per returned country, ranked by users and capped at the row limit selected above. Share is of users WITH a country, and the active, paying and trial columns are subsets of that country's users.",
      breakdownCaption: "Users, activity and paying rate by country",
      breakdownEmpty: "No country rows in this range.",
    },
  },
};

const pt: Dict = {
  toggle: {
    label: "Idioma",
    english: "English",
    portuguese: "Português",
  },
  nav: {
    eyebrow: "Admin",
    title: "Analytics de produto",
    description:
      "Métricas operacionais do Survival Academy, lidas diretamente da API de analytics do backend. Todos os números são calculados no servidor; definições e limitações conhecidas aparecem ao lado dos números.",
    sectionsAria: "Seções de analytics",
    tab: {
      overview: "Visão geral",
      users: "Usuários",
      engagement: "Engajamento",
      learning: "Funil",
      content: "Conteúdo",
      gaps: "Lacunas de conhecimento",
      stalled: "Parados",
      retention: "Retenção",
      community: "Comunidade",
      gamification: "Gamificação",
      billing: "Cobrança",
      geography: "Geografia",
    },
  },
  access: {
    deniedTitle: "Acesso de administrador necessário",
    deniedDescription:
      "Esta área é restrita a administradores. Sua conta não tem o papel de administrador.",
    unreachableTitle: "Não foi possível verificar o acesso de administrador",
    unreachableDescription:
      "Não foi possível acessar a API de analytics, então o acesso não pôde ser confirmado. Recarregue a página para tentar novamente.",
  },
  filters: {
    range: "Período",
    presetsAria: "Períodos predefinidos",
    preset: {
      today: "Hoje",
      yesterday: "Ontem",
      "7d": "7d",
      "30d": "30d",
      "90d": "90d",
      "365d": "12m",
    },
    allTime: "Todo o período",
    from: "De",
    to: "Até",
    plan: "Plano",
    allPlans: "Todos os planos",
    planFree: "Free",
    planSurvivor: "Survivor",
    planOperator: "Operator",
    country: "País",
    allCountries: "Todos os países",
    bucket: "Intervalo",
    granularityDay: "Diário",
    granularityWeek: "Semanal",
    granularityMonth: "Mensal",
    reset: "Limpar",
    rangeNotRequested: "Período não solicitado ·",
    rangeInverted: "A data inicial é posterior à data final.",
    rangeTooLong: "Este período tem {{days}} dias. Os endpoints de série aceitam no máximo {{maxDays}} dias — reduza o período ou escolha uma predefinição mais curta.",
  },
  charts: {
    noRows: "Nenhuma linha neste período.",
    noBuckets: "Nenhum intervalo neste período.",
    notEnoughBuckets: "Intervalos insuficientes para uma tendência.",
    notYetObservable: "ainda não observável",
    notAvailable: "Não disponível",
    definitions: "Definições e ressalvas",
    allTime: "Todo o período",
    noComparisonPeriod: "Sem período de comparação",
    noChange: "Sem variação (0 antes)",
    newlyObserved: "Novo (0 → {{current}})",
    versusPrevious: "{{pct}} vs. anterior ({{previous}})",
    barsAria: "{{base}}. {{buckets}} intervalos. Pico {{peak}} em {{peakLabel}}.",
    sparkAria: "{{base}}. {{buckets}} intervalos, mínimo {{low}}, máximo {{high}}.",
  },
  common: {
    adjustRange: "Ajuste o período acima para carregar estas métricas.",
    adjustRangeLearning: "Ajuste o período acima para carregar as etapas de aprendizado.",
    adjustRangeContent: "Ajuste o período acima para carregar o desempenho do conteúdo.",
    adjustRangeGaps: "Ajuste o período acima para carregar as lacunas de conhecimento.",
    adjustRangeStalled: "Ajuste o período acima para carregar os usuários parados.",
    adjustRangeRetention: "Ajuste o período acima para carregar as coortes de retenção.",
    loadMore: "Carregar mais",
    loading: "Carregando…",
  },
  errors: {
    timeout: "O servidor demorou demais para responder.",
    offlineTitle: "Você parece estar offline.",
    offlineDescription: "Verifique sua conexão e tente novamente.",
    forbidden: "Você não tem acesso a este conteúdo.",
    notFound: "Este conteúdo não está disponível.",
    rateLimitedTitle: "Muitas requisições.",
    rateLimitedWait: "Aguarde um momento e tente novamente.",
    rateLimitedRetryAfter: "Tente novamente em cerca de {{seconds}} segundos.",
    genericTitle: "Algo deu errado.",
    genericDescription: "Tente novamente.",
    retry: "Tentar novamente",
    reference: "Referência:",
  },
  tabs: {
    overview: {
      kpiTotalUsers: "Usuários totais",
      kpiNewUsers: "Novos usuários",
      kpiPayingUsers: "Usuários pagantes",
      kpiFreeUsers: "Usuários gratuitos",
      kpiTrialUsers: "Usuários em teste",
      kpiChurnedUsers: "Usuários cancelados",
      kpiActiveUsers: "Usuários ativos",
      kpiActiveDays: "Dias ativos",
      kpiLessonsCompleted: "Lições concluídas",
      kpiQuizSubmissions: "Respostas de quiz",
      kpiXpAwarded: "XP concedido",
      hintSignedUpInRange: "Cadastraram-se no período",
      hintEffectiveNotFree: "Plano efetivo ≠ free",
      hintCurrentlyTrialing: "Em teste no momento",
      hintChurned: "Plano não gratuito registrado, efetivamente free agora",
      hintLearningActive: "Ativo em aprendizado, não visitas",
      hintAcceptedCompletions: "Aceitas, sem inflação por repetição",
      ratioLessonsPerActive: "Lições / usuário ativo",
      ratioLessonsPerActiveHint: "Lições concluídas ÷ usuários ativos",
      ratioQuizzesPerActive: "Respostas de quiz / usuário ativo",
      ratioQuizzesPerActiveHint: "Respostas ÷ usuários ativos",
      ratioXpPerActive: "XP / usuário ativo",
      ratioXpPerActiveHint: "XP concedido ÷ usuários ativos (repetições inflam)",
      ratioActiveDaysPerActive: "Dias ativos / usuário ativo",
      ratioActiveDaysPerActiveHint: "Sessões de aprendizado por usuário ativo",
      keyMetricsTitle: "Métricas principais",
      keyMetricsDescription:
        "Totais do período selecionado, com o valor equivalente do período anterior de mesma duração.",
      perActiveUserTitle: "Por usuário ativo",
      perActiveUserDescription:
        "Médias entre os usuários ativos em aprendizado no período — a precisão das razões no backend é de duas casas decimais.",
      windowsTitle: "Janelas de atividade",
      windowsDescription: "Medidas ao final do período selecionado.",
      dau: "DAU",
      wau: "WAU",
      mau: "MAU",
      dauHint: "Ativos no último dia",
      wauHint: "Ativos nos últimos 7 dias",
      mauHint: "Ativos nos últimos 30 dias",
      unsupportedTitle: "Não mensurável a partir deste banco de dados",
      unsupportedDescription:
        "O backend informa essas métricas como não suportadas em vez de aproximá-las.",
      unsupportedRevenue: "Receita / MRR / ARR",
      unsupportedPlanChanges: "Upgrades e downgrades",
      unsupportedVisitDau: "DAU por visitas",
    },
    users: {
      kpiTotalUsers: "Usuários totais",
      kpiNewUsers: "Novos usuários",
      kpiPayingUsers: "Usuários pagantes",
      kpiFreeUsers: "Usuários gratuitos",
      kpiChurnedUsers: "Usuários cancelados",
      hintSignedUpInRange: "Cadastraram-se no período",
      hintEffectiveNotFree: "Plano efetivo ≠ free",
      hintEffectiveFree: "Plano efetivo é free",
      hintChurned: "Plano não gratuito registrado, efetivamente free agora",
      colPlan: "Plano",
      colUsers: "Usuários",
      colShareOfUsers: "Participação de usuários",
      colActiveUsers: "Usuários ativos",
      colActiveRate: "Taxa de atividade",
      colTrialUsers: "Usuários em teste",
      colLessonsCompleted: "Lições concluídas",
      colDistinctLessons: "Lições distintas",
      colQuizSubmissions: "Respostas de quiz",
      colActiveDays: "Dias ativos",
      colXpAwarded: "XP concedido",
      colLessonsPerActive: "Lições / usuário ativo",
      colXpPerActive: "XP / usuário ativo",
      colCountry: "País",
      colPayingUsers: "Usuários pagantes",
      keyMetricsTitle: "Métricas principais",
      keyMetricsDescription: "Quem a plataforma tem, ao final do período selecionado.",
      newUsersTitle: "Novos usuários",
      newUsersDescription: "Cadastros por intervalo ao longo do período selecionado.",
      newUsersAria: "Novos usuários por intervalo",
      planBreakdownTitle: "Distribuição por plano",
      planBreakdownDescription:
        "Sempre três linhas — uma por código de plano, preenchidas com zero. Lições concluídas conta conclusões aceitas no período; lições distintas conta lições distintas a partir das linhas de progresso.",
      planBreakdownCaption: "Usuários por plano efetivo",
      planBreakdownEmpty: "Nenhuma linha de plano neste período.",
      statusTitle: "Status da assinatura",
      statusDescription:
        "O status armazenado em cada linha de assinatura — a entrada das regras de plano efetivo, não a saída delas. Usuários sem nenhuma linha de assinatura não aparecem aqui.",
      statusAria: "Usuários por status de assinatura",
      topCountriesTitle: "Principais países",
      topCountriesDescription:
        "Classificados por usuários. O servidor limita esta lista a 20 linhas, então ela é o topo da distribuição e não a distribuição inteira.",
      topCountriesCaption: "Principais países por usuários",
      topCountriesEmpty: "Nenhuma linha de país neste período.",
    },
    engagement: {
      counterActiveUsers: "Usuários ativos",
      counterLessonCompletions: "Lições concluídas",
      counterQuizSubmissions: "Respostas de quiz",
      counterLessonStarts: "Lições iniciadas",
      counterCompletionEvents: "Eventos de conclusão",
      counterQuizzesStarted: "Quizzes iniciados",
      counterQuizzesCompleted: "Quizzes concluídos",
      counterDownloads: "Downloads",
      counterPosts: "Publicações",
      counterComments: "Comentários",
      counterVotes: "Votos",
      counterXpAwarded: "XP concedido",
      trendCommunityPosts: "Publicações na comunidade",
      activeUsersTitle: "Usuários ativos",
      activeUsersDescription:
        "Duas populações diferentes, contadas de forma independente. Elas se sobrepõem, portanto os dois números não são somados.",
      kpiLearningActiveUsers: "Usuários ativos em aprendizado",
      kpiLearningActiveHint: "Concluíram uma lição ou responderam um quiz",
      kpiCommunityActiveUsers: "Usuários ativos na comunidade",
      kpiCommunityActiveHint: "Publicaram, comentaram ou votaram",
      activityTotalsTitle: "Totais de atividade",
      activityTotalsDescription:
        "Totais do período selecionado. Os três vêm de atividade de aprendizado — nenhum deles descreve a comunidade.",
      kpiActiveDays: "Dias ativos",
      kpiActiveDaysHint: "Dias-usuário com atividade de aprendizado",
      kpiLessonsCompleted: "Lições concluídas",
      kpiLessonsCompletedHint: "Conclusões aceitas, sem inflação por repetição",
      kpiQuizSubmissions: "Respostas de quiz",
      windowsTitle: "Janelas de atividade",
      windowsDescription: "Medidas ao final do período selecionado.",
      dau: "DAU",
      wau: "WAU",
      mau: "MAU",
      dauHint: "Ativos no último dia",
      wauHint: "Ativos nos últimos 7 dias",
      mauHint: "Ativos nos últimos 30 dias",
      byBucketTitle: "Atividade por intervalo",
      byBucketDescription:
        "Usuários ativos em cada intervalo do período, com os contadores mais usados em tendência abaixo. Um intervalo sem atividade é desenhado como uma marca tênue, não como uma lacuna.",
      activePerBucketAria: "Usuários ativos por {{granularity}}",
      trendPerBucketAria: "{{label}} por intervalo",
      allCountersTitle: "Todos os contadores, por intervalo",
      allCountersDescription:
        "Todos os treze contadores de cada intervalo, exatamente como retornados — incluindo os que as tendências acima não exibem.",
      allCountersCaption: "Contadores de engajamento por intervalo",
      allCountersEmpty: "Nenhum intervalo neste período.",
      lessonStartsNote:
        "Lições iniciadas só são registradas a partir da data em que a instrumentação de início de lição entrou no ar — intervalos anteriores as subestimam.",
    },
    learning: {
      stage: {
        users: "Todos os usuários no período",
        lesson_started: "Iniciou uma lição",
        lesson_completed: "Concluiu uma lição",
        quiz_started: "Iniciou um quiz",
        quiz_submitted: "Respondeu um quiz",
        quiz_passed: "Passou em um quiz",
        module_progressed: "Avançou em um módulo",
      },
      colPlan: "Plano",
      colStarted: "Iniciou uma lição",
      colCompleted: "Concluiu uma lição",
      usersCount: "{{count}} usuários",
      ofAllUsers: "{{pct}} de todos os usuários no período",
      fromPrevious: "Do anterior:",
      dropOff: "Abandono:",
      stagesTitle: "Etapas de aprendizado",
      stagesDescription:
        "Usuários distintos que realizaram cada ação no período selecionado, desenhados em uma mesma escala.",
      notNestedLabel: "As etapas não são aninhadas",
      byPlanTitle: "Iniciadas vs. concluídas, por plano",
      byPlanDescription: "As duas etapas de lição divididas pelo plano efetivo do usuário.",
      byPlanCaption: "Lições iniciadas e concluídas por plano",
      byPlanEmpty: "Nenhuma linha de plano neste período.",
    },
    content: {
      colLesson: "Lição",
      colModule: "Módulo",
      colCategory: "Categoria",
      colDifficulty: "Dificuldade",
      knownDifficulty: { beginner: "Iniciante", intermediate: "Intermediário", advanced: "Avançado" },
      colEstMinutes: "Min. estimados",
      colUsersStarted: "Usuários que iniciaram",
      colUsersCompleted: "Usuários que concluíram",
      colCompletionRate: "Taxa de conclusão",
      colUsersStalled: "Usuários parados",
      colAvgSeconds: "Média de segundos para concluir",
      colDurationSample: "Amostra de duração",
      colLessons: "Lições",
      colQuizAttempts: "Tentativas de quiz",
      colQuizPassRate: "Taxa de aprovação em quiz",
      colQuizAvgScore: "Nota média em quiz (0–100)",
      colQuiz: "Quiz",
      colPassingScore: "Nota de aprovação (0–1)",
      colUniqueUsers: "Usuários únicos",
      colAttempts: "Tentativas",
      colPassRate: "Taxa de aprovação",
      colFirstAttemptPassRate: "Taxa de aprovação na 1ª tentativa",
      colAvgScore: "Nota média (0–100)",
      colAttemptsPerUser: "Tentativas / usuário",
      type: "Tipo",
      typeLesson: "Lições",
      typeModule: "Módulos",
      typeQuiz: "Quizzes",
      searchTitle: "Buscar por título",
      searchPlaceholder: "Título da lição ou do módulo",
      search: "Buscar",
      sortBy: "Ordenar por",
      sort: {
        lesson: {
          default: "Mais iniciadas (padrão)",
          mostCompleted: "Mais concluídas",
          lowestCompletion: "Menor taxa de conclusão",
          mostStalled: "Mais usuários parados",
          longestEstimated: "Maior duração estimada",
          title: "Título (A–Z)",
        },
        module: {
          default: "Mais iniciados (padrão)",
          mostCompleted: "Mais concluídos",
          lowestCompletion: "Menor taxa de conclusão",
          mostAttempts: "Mais tentativas de quiz",
          lowestQuizPass: "Menor taxa de aprovação em quiz",
          title: "Título (A–Z)",
        },
        quiz: {
          default: "Mais tentativas (padrão)",
          mostUsers: "Mais usuários",
          lowestPass: "Menor taxa de aprovação",
          lowestFirstPass: "Menor taxa de aprovação na 1ª tentativa",
          lowestScore: "Menor nota média",
          title: "Título (A–Z)",
        },
      },
      defaultOrder: "ordem padrão do backend",
      title: "Desempenho do conteúdo",
      description:
        "Um formato de linha por tipo: lições, módulos e quizzes têm cada um sua própria tabela, ordenação e colunas.",
      captionLesson: "Desempenho das lições no período",
      captionModule: "Desempenho dos módulos no período",
      captionQuiz: "Desempenho dos quizzes no período",
      emptyLesson: "Nenhuma lição corresponde a esta visão.",
      emptyModule: "Nenhum módulo corresponde a esta visão.",
      emptyQuiz: "Nenhum quiz corresponde a esta visão.",
      rowsLabel: {
        perPage: "{{pageSize}} lições por página",
        matching: "lições que correspondem a \"{{query}}\", {{pageSize}} por página",
      },
    },
    gaps: {
      colObjective: "Objetivo de aprendizado",
      colTaughtIn: "Ensinado em",
      colCategory: "Categoria",
      colAnswers: "Respostas",
      colCorrect: "Corretas",
      colAccuracy: "Precisão",
      colUsers: "Usuários",
      colQuestion: "Pergunta",
      colDifficulty: "Dificuldade",
      colAskedIn: "Perguntada em",
      colKnowledgeItem: "Item de conhecimento",
      weakestObjectivesTitle: "Objetivos mais fracos",
      weakestQuestionsTitle: "Perguntas mais fracas",
      weakestItemsTitle: "Itens de conhecimento mais fracos",
      lowestAccuracyFirst: "Menor precisão primeiro, exatamente na ordem do backend.",
      minAnswers: "Mín. de respostas",
      rowsPerList: "Linhas por lista",
      floorInEffect: "Piso em vigor: {{floor}} respostas por linha.",
      objectivesCaption: "Objetivos de aprendizado mais fracos por precisão",
      objectivesEmpty: "Nenhum objetivo atinge o piso de amostra neste período.",
      questionsCaption: "Perguntas de quiz mais fracas por precisão",
      questionsEmpty: "Nenhuma pergunta atinge o piso de amostra neste período.",
      itemsCaption: "Itens de conhecimento mais fracos por precisão",
      itemsEmpty: "Nenhum item de conhecimento atinge o piso de amostra neste período.",
    },
    stalled: {
      signalOpenedLessons: "abriu lições, nunca concluiu",
      signalInactive: "inativo há mais de 30 dias",
      signalSingleSession: "usuário de sessão única",
      signalQuizzesWithoutProgress: "quizzes sem progresso em lições",
      colUser: "Usuário",
      colPlan: "Plano",
      colSignedUp: "Cadastro",
      colLastActivity: "Última atividade",
      daysStalled: "{{days}} dias parado",
      colLastProgress: "Último progresso",
      colLessons: "Lições",
      colQuizAttempts: "Tentativas de quiz",
      colActiveDays: "Dias ativos",
      colUnansweredStarts: "Inícios sem resposta",
      colLastKnownPosition: "Última posição conhecida",
      colSignals: "Sinais",
      noneFlagged: "nenhum sinal",
      title: "Usuários parados",
      description:
        "Mais parados primeiro. Esta lista é a única superfície com dados pessoais da API: nome e e-mail são retornados para que ela seja usada como fila de contato.",
      daysStalledControl: "Dias parado",
      caption: "Usuários parados, mais parados primeiro",
      empty: "Nenhum usuário atende a este limite no período selecionado.",
      kpiMinDaysStalled: "Mín. de dias parado",
      kpiMinAccountAge: "Idade mín. da conta (dias)",
      definitionLabel: "Definição",
      notMeasurableLabel: "Não mensurável",
      activitySourceLabel: "Fonte de atividade ·",
    },
    retention: {
      cohortDay: "Coortes diárias",
      cohortWeek: "Coortes semanais",
      cohortMonth: "Coortes mensais",
      colCohort: "Coorte",
      colSize: "Tamanho",
      colObservable: "Observável",
      observableDay: "dia {{day}}",
      usersCount: "{{count}} usuários",
      title: "Coortes de cadastro",
      description:
        "Parcela de cada coorte de cadastro que voltou para aprender nos dias 1, 7, 14 e 30.",
      cohortBy: "Coortes por",
      cohorts: "Coortes",
      caption: "Retenção por coorte de cadastro",
      empty: "Nenhuma coorte neste período.",
    },
    community: {
      colBucket: "Intervalo",
      colPosts: "Publicações",
      colComments: "Comentários",
      colVotes: "Votos",
      colPlan: "Plano",
      colAuthors: "Autores",
      activityTitle: "Atividade da comunidade",
      activityDescription:
        "Contagem de linhas para cada ação no período — uma linha por evento, não por pessoa.",
      kpiPosts: "Publicações",
      kpiComments: "Comentários",
      kpiVotes: "Votos",
      kpiVotesHint: "Somente votos positivos",
      kpiReports: "Denúncias",
      kpiReportsHint: "Únicas por denunciante e alvo",
      kpiActiveUsers: "Usuários ativos",
      kpiActiveUsersHint: "Publicaram, comentaram ou votaram",
      authorsTitle: "Autores distintos",
      authorsDescription:
        "Pessoas, não linhas. Quem publicou cinco vezes é um autor aqui e cinco publicações no painel acima.",
      kpiPostAuthors: "Autores de publicações",
      kpiCommentAuthors: "Autores de comentários",
      kpiVoteAuthors: "Autores de votos",
      distinctPeople: "Pessoas distintas",
      byBucketTitle: "Publicações por intervalo",
      byBucketDescription:
        "Publicações criadas em cada intervalo do período, com os comentários e votos registrados ao lado delas.",
      byBucketAria: "Publicações da comunidade por intervalo",
      byBucketCaption: "Linhas da comunidade por intervalo",
      byBucketEmpty: "Nenhum intervalo neste período.",
      byPlanTitle: "Por plano",
      byPlanDescription:
        "Publicações e comentários atribuídos ao plano de seus autores. Votos não são detalhados por plano.",
      byPlanAria: "Publicações por plano",
      byPlanCaption: "Atividade da comunidade por plano",
      byPlanEmpty: "Nenhum plano para detalhar neste período.",
    },
    gamification: {
      colBucket: "Intervalo",
      colXpAwarded: "XP concedido",
      colUsersAwarded: "Usuários contemplados",
      colAchievement: "Conquista",
      colKey: "Chave",
      colUnlocks: "Desbloqueios",
      xpTitle: "XP",
      xpDescription: "Todas as transações de XP no período, somadas por intervalo.",
      kpiXpAwarded: "XP concedido",
      kpiXpAwardedHint: "Valores concedidos — repetições podem conceder novamente",
      kpiXpPerActive: "XP / usuário ativo",
      kpiXpPerActiveHint: "XP concedido ÷ usuários ativos nos últimos 30 dias",
      xpPerBucketAria: "XP concedido por intervalo",
      xpCaption: "XP concedido por intervalo",
      xpEmpty: "Nenhum XP foi concedido neste período.",
      streaksTitle: "Sequências",
      streaksDescription:
        "Os tamanhos de sequência são contagens de dias. A distribuição abaixo desenha apenas os tamanhos que têm usuários — um tamanho que ninguém tem não aparece, em vez de aparecer como barra zerada.",
      kpiUsersWithStreak: "Usuários com sequência",
      kpiUsersWithStreakHint: "Sequência atual acima de zero",
      kpiAvgCurrentStreak: "Sequência atual média",
      kpiAvgLongestStreak: "Maior sequência média",
      kpiMaxCurrentStreak: "Sequência atual máxima",
      kpiMaxLongestStreak: "Maior sequência máxima",
      kpiStreakRows: "Linhas de sequência",
      kpiStreakRowsHint: "Não é um sinal de engajamento",
      distributionLabel: "Usuários por tamanho da sequência atual",
      distributionAria: "Usuários por tamanho da sequência atual, em dias",
      achievementsTitle: "Conquistas",
      achievementsDescription:
        "Desbloqueios registrados no período e o catálogo de definições de onde vêm.",
      achievementsDescriptionEmpty:
        "O backend informa que não há definições de conquista neste banco de dados.",
      nothingCanUnlock: "Nada pode ser desbloqueado",
      achievementsFallback:
        "Nenhuma definição de conquista foi populada neste banco de dados, então nenhuma conquista pode ser desbloqueada.",
      kpiUnlockedInRange: "Desbloqueadas no período",
      kpiUsersWithUnlocks: "Usuários com desbloqueios",
      kpiUsersWithUnlocksHint: "Pessoas distintas",
      kpiDefinedAchievements: "Conquistas definidas",
      kpiDefinedAchievementsHint: "Disponíveis para desbloquear",
      achievementsCaption: "Conquistas mais desbloqueadas no período",
      achievementsEmpty: "Nenhuma conquista foi desbloqueada neste período.",
    },
    billing: {
      colPlanCode: "Código de plano registrado",
      colSubscriptionRows: "Linhas de assinatura",
      colStatus: "Status",
      effectiveTitle: "Planos efetivos",
      effectiveDescription:
        "O plano de cada usuário resolvido agora, após a aplicação das regras de status e período armazenados — o plano que as verificações de acesso enxergam.",
      kpiPayingUsers: "Usuários pagantes",
      kpiPayingUsersHint: "Plano efetivo ≠ free",
      kpiFreeUsers: "Usuários gratuitos",
      kpiFreeUsersHint: "Plano efetivo é free",
      kpiTrialUsers: "Usuários em teste",
      kpiTrialUsersHint: "Em teste no momento",
      kpiChurnedUsers: "Usuários cancelados",
      kpiChurnedUsersHint: "Plano não gratuito registrado, efetivamente free agora",
      movementTitle: "Movimentação de assinaturas",
      movementDescription:
        "Assinaturas criadas e canceladas no período selecionado, e as que estão em teste agora.",
      kpiNewSubscriptions: "Novas assinaturas",
      kpiNewSubscriptionsHint: "Criadas no período",
      kpiCancellations: "Cancelamentos",
      kpiCancellationsHint: "Canceladas no período",
      kpiTrials: "Testes",
      kpiTrialsHint:
        "Em teste agora cujo período começou no intervalo — não são testes iniciados",
      newSubscriptions: "Novas assinaturas",
      newSubscriptionsAria: "Novas assinaturas por intervalo",
      cancellations: "Cancelamentos",
      cancellationsAria: "Cancelamentos por intervalo",
      planCodeTitle: "Código de plano registrado",
      planCodeDescription:
        "Todas as linhas de assinatura agrupadas pelo subscriptions.plan_code armazenado — estado bruto, antes da aplicação das regras de plano efetivo. Uma assinatura cancelada ou não paga ainda carrega seu código armazenado aqui, então esta visão difere dos cartões de plano efetivo acima.",
      planCodeCaption: "Linhas de assinatura por código de plano armazenado",
      planCodeEmpty: "Nenhuma linha de assinatura.",
      totalRows: "{{count}} linhas de assinatura no total entre estes planos.",
      statusTitle: "Status da assinatura",
      statusDescription:
        "O status armazenado por trás de cada linha de assinatura — a entrada das regras de plano efetivo, não a saída delas.",
      statusCaption: "Linhas de assinatura por status",
      statusEmpty: "Nenhuma linha de assinatura.",
      unsupportedTitle: "Não mensurável a partir deste banco de dados",
      unsupportedDescription:
        "O backend informa essas métricas como não suportadas em vez de aproximá-las.",
      unsupportedRevenue: "Receita / MRR / ARR",
      unsupportedPlanChanges: "Upgrades e downgrades",
    },
    geography: {
      colCountry: "País",
      colUsers: "Usuários",
      colShare: "Participação",
      colActiveUsers: "Usuários ativos",
      colActiveRate: "Taxa de atividade",
      colPayingUsers: "Usuários pagantes",
      colPayingRate: "Taxa de pagantes",
      colTrialUsers: "Usuários em teste",
      coverageTitle: "Cobertura",
      coverageDescription:
        "País é o valor declarado pelo usuário em seu perfil, validado como código ISO na gravação — não de onde ele se conectou.",
      countries: "Países",
      kpiUsersWithCountry: "Usuários com país",
      kpiUsersWithCountryHint: "Declarado no perfil",
      kpiUsersWithoutCountry: "Usuários sem país",
      kpiUsersWithoutCountryHint: "Não é exigido no cadastro",
      kpiCoverage: "Cobertura",
      kpiCoverageHint: "Parcela de usuários com país",
      coverageNote:
        "Cobertura abaixo de 100% significa que os demais usuários não têm país registrado — desconhecido, não zero. Cada porcentagem na tabela abaixo é sobre os usuários COM país, então esses usuários ficam fora do denominador.",
      byCountryTitle: "Usuários por país",
      byCountryDescription:
        "As linhas retornadas em ordem de classificação — uma barra por país, na mesma ordem usada pela tabela abaixo.",
      byCountryAria: "Usuários por país",
      breakdownTitle: "Detalhamento por país",
      breakdownDescription:
        "Uma linha por país retornado, classificadas por usuários e limitadas ao limite de linhas selecionado acima. Participação é sobre usuários COM país, e as colunas de ativos, pagantes e teste são subconjuntos dos usuários daquele país.",
      breakdownCaption: "Usuários, atividade e taxa de pagantes por país",
      breakdownEmpty: "Nenhuma linha de país neste período.",
    },
  },
};

export const STRINGS: Record<AdminLanguage, Dict> = { en, pt };

function lookup(language: AdminLanguage, key: string): unknown {
  let node: unknown = STRINGS[language];
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

/** Static copy. `t("charts.noRows")`. */
export function translate(language: AdminLanguage, key: string): string {
  const value = lookup(language, key);
  // A missing key is a programming error rather than a rendering
  // condition; the key itself is shown so a mistake is visible instead of
  // rendering blank.
  return typeof value === "string" ? value : key;
}

const PLACEHOLDER = /\{\{(\w+)\}\}/g;

/**
 * Copy with `{{name}}` placeholders filled in, for text whose word order
 * differs between languages ("25 users" / "25 usuários", and "{{pct}} of all
 * users in range" / "{{pct}} de todos os usuários no período").
 *
 * A placeholder the dictionary declares but the caller did not supply would
 * render as a literal `{{days}}` on screen, so it throws instead — that only
 * ever fires from a caller bug, and the console's tests catch it.
 */
export function interpolate(
  language: AdminLanguage,
  key: string,
  params: Readonly<Record<string, number | string>>,
): string {
  const template = lookup(language, key);
  if (typeof template !== "string") {
    throw new Error(`admin-analytics i18n: "${key}" is not an interpolated string`);
  }
  return template.replace(PLACEHOLDER, (_match, name: string) => {
    const value = params[name];
    if (value === undefined) {
      throw new Error(`admin-analytics i18n: "${key}" is missing the "{{${name}}}" value`);
    }
    return String(value);
  });
}
