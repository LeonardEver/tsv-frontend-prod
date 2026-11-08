/**
 * The Simplified guided experience (src/features/simplified).
 *
 * What this protects:
 *   - the PRO / SIMPLIFIED switch is reachable from PRO chrome, persists as a
 *     device preference, and "/" honours it;
 *   - the guided roadmap selects the first incomplete mission of the CURRENT
 *     region and never advances early;
 *   - the field test is gated on the MISSION BEING COMPLETE — on Free,
 *     Survivor AND Operator. The paid plans carry `quiz_before_lesson: true`,
 *     i.e. exactly the entitlement that opens the quiz in PRO, so these cases
 *     fail loudly if the Simplified screen ever starts reading entitlements;
 *   - a field-test result keeps the learner inside Simplified;
 *   - PRO is untouched.
 *
 * API mocked at the network boundary — no real backend, never production.
 * The fixtures mirror the real contract shapes used across the existing
 * suite (see quiz.spec.ts, learning-flow.spec.ts).
 */
import { expect, test, type Page } from "@playwright/test";

const API = "**/api/v1/**";
const EXPERIENCE_KEY = "survival-academy-experience";

const USER = {
  user_id: 1,
  email: "learner@example.com",
  display_name: "Learner",
  role: "user",
  created_at: "2026-08-01T12:00:00Z",
};

const CATEGORIES = {
  categories: [
    {
      slug: "survival-fundamentals",
      code: "SUR",
      title: "Survival Fundamentals",
      module_count: 2,
      completed_count: 1,
    },
    { slug: "water", code: "WAT", title: "Water", module_count: 1, completed_count: 0 },
  ],
};

/** Curriculum order: SUR before WAT. SUR-kit is the first incomplete mission. */
const MODULE_ROWS = [
  {
    module_id: "SUR-prioritization",
    title: "Priorities of Survival",
    category: "survival-fundamentals",
    subcategory: null,
    difficulty: "beginner",
    estimated_duration: 15,
    description: "The order that keeps you alive.",
  },
  {
    module_id: "SUR-kit",
    title: "Building Your Kit",
    category: "survival-fundamentals",
    subcategory: null,
    difficulty: "beginner",
    estimated_duration: 20,
    description: "Carry only what earns its weight.",
  },
  {
    module_id: "WAT-boiling",
    title: "Boiling Water for Purification",
    category: "water",
    subcategory: null,
    difficulty: "beginner",
    estimated_duration: 20,
    description: "The most reliable single purification method.",
  },
] as const;

const LESSON_SECTIONS = [
  { type: "introduction", heading: "Introduction", content: "Why this matters in the field." },
  { type: "core_content", heading: "Core skills", content: "What you actually carry." },
  { type: "practice_exercise", heading: "Practice", content: "Assemble the kit you own." },
  { type: "field_application", heading: "Apply", content: "Run the kit under load." },
];

/** The three plans, with their REAL entitlement contracts. */
const PLANS = {
  free: {
    plan_code: "free",
    plan_name: "Free",
    entitlements: { daily_lessons: 1, daily_quizzes: 1, resource_download: false, quiz_before_lesson: false, community: false },
  },
  survivor: {
    plan_code: "survivor",
    plan_name: "Survivor",
    entitlements: { daily_lessons: 10, daily_quizzes: 10, resource_download: true, quiz_before_lesson: true, community: true },
  },
  operator: {
    plan_code: "operator",
    plan_name: "Operator",
    entitlements: { daily_lessons: 100, daily_quizzes: 100, resource_download: true, quiz_before_lesson: true, community: true },
  },
} as const;

type PlanName = keyof typeof PLANS;

interface World {
  /** Module ids whose lesson the backend reports complete. */
  lessons: Set<string>;
  /** Module ids the backend reports as fully complete. */
  modules: Set<string>;
  plan: PlanName;
  attempt: number;
  graded: Set<string>;
}

/**
 * `lessonsDone` and `modulesDone` are the BACKEND's verdicts, seeded per test.
 * They are distinct on purpose: a finished lesson does not complete a mission
 * (the field test does), which is exactly the state the gate has to tell
 * apart.
 */
function newWorld(options: {
  plan?: PlanName;
  lessonsDone?: string[];
  modulesDone?: string[];
} = {}): World {
  return {
    lessons: new Set(options.lessonsDone ?? []),
    modules: new Set(options.modulesDone ?? []),
    plan: options.plan ?? "free",
    attempt: 0,
    graded: new Set(),
  };
}

/** Server-derived module row — `completed` is the backend's call, never ours. */
function moduleRow(world: World, id: string) {
  const base = MODULE_ROWS.find((m) => m.module_id === id) ?? MODULE_ROWS[0];
  const complete = world.modules.has(id);
  return {
    ...base,
    completed: complete,
    progress_pct: complete ? 100 : world.lessons.has(id) ? 50 : 0,
  };
}

function moduleDetail(world: World, id: string) {
  const row = moduleRow(world, id);
  const lessonDone = world.lessons.has(id);
  return {
    module_id: row.module_id,
    title: row.title,
    description: row.description,
    category: row.category,
    subcategory: null,
    difficulty: row.difficulty,
    estimated_duration: row.estimated_duration,
    content_version: 1,
    knowledge_items: [],
    lesson: {
      lesson_id: `${id}-L01`,
      title: row.title,
      estimated_minutes: 20,
      completed: lessonDone,
    },
    quiz: {
      quiz_id: `${id}-Q01`,
      title: `${row.title} — Field Test`,
      question_count: 1,
      best_score: null,
      attempt_count: 0,
    },
    resources: [],
    progress: {
      lesson_completed: lessonDone,
      quiz_best_score: null,
      completed: world.modules.has(id),
    },
  };
}

const QUIZ = (moduleId: string) => ({
  quiz_id: `${moduleId}-Q01`,
  module_id: moduleId,
  title: "Field Test",
  question_count: 1,
  questions: [
    {
      question_id: "q01",
      question_type: "multiple_choice",
      question_text: "Which is the most reliable single purification method?",
      options: [
        { label: "A", text: "Boiling" },
        { label: "B", text: "Settling" },
      ],
    },
  ],
});

function mockBackend(page: Page, world: World): void {
  void page.route(API, (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    const notFound = () =>
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "NOT_FOUND", message: "not found", request_id: "e2e-s" } }),
      });

    // ── Writes ──────────────────────────────────────────────────────────
    const completeMatch = path.match(/^\/api\/v1\/lessons\/(.+)\/complete$/);
    if (req.method() === "POST" && completeMatch?.[1]) {
      const lessonId = completeMatch[1];
      world.lessons.add(lessonId.replace(/-L01$/, ""));
      return json({ lesson_id: lessonId, completed: true, completed_at: "2026-09-27T12:00:00Z" });
    }

    if (req.method() === "POST" && path.endsWith("/attempts") && !path.includes("/answers")) {
      world.attempt += 1;
      return json(
        {
          attempt_id: world.attempt,
          quiz_id: path.split("/")[4],
          status: "in_progress",
          started_at: "2026-09-27T12:00:00Z",
          replayed: false,
        },
        201,
      );
    }

    const answersMatch = path.match(/^\/api\/v1\/quizzes\/([^/]+)\/attempts\/(\d+)\/answers$/);
    if (req.method() === "POST" && answersMatch?.[1] && answersMatch[2]) {
      const moduleId = answersMatch[1].replace(/-Q01$/, "");
      world.graded.add(answersMatch[2]);
      // Passing the field test is what completes the mission.
      world.modules.add(moduleId);
      return json({
        attempt_id: Number(answersMatch[2]),
        score: 100,
        total_questions: 1,
        correct_count: 1,
        passed: true,
        passing_score: 0.7,
        results: [
          {
            question_id: "q01",
            user_answer: "A",
            correct_answer: "A",
            is_correct: true,
            explanation: "A rolling boil kills biological pathogens.",
          },
        ],
        lo_performance: [],
        xp_earned: 25,
        completed_at: "2026-09-27T12:05:00Z",
      });
    }

    // ── Reads ───────────────────────────────────────────────────────────
    const detailMatch = path.match(/^\/api\/v1\/modules\/(.+)$/);
    if (detailMatch?.[1]) return json(moduleDetail(world, detailMatch[1]));

    const quizMatch = path.match(/^\/api\/v1\/quizzes\/([^/]+)$/);
    if (quizMatch?.[1]) return json(QUIZ(quizMatch[1].replace(/-Q01$/, "")));

    const lessonMatch = path.match(/^\/api\/v1\/lessons\/(.+)$/);
    if (lessonMatch?.[1]) {
      const moduleId = lessonMatch[1].replace(/-L01$/, "");
      return json({
        lesson_id: lessonMatch[1],
        module_id: moduleId,
        title: "Lesson",
        estimated_minutes: 20,
        content_version: 1,
        sections: LESSON_SECTIONS,
        progress: { completed: world.lessons.has(moduleId), last_position: null },
      });
    }

    switch (path) {
      case "/api/v1/auth/me":
        return json(USER);
      case "/api/v1/categories":
        return json(CATEGORIES);
      case "/api/v1/modules":
        return json({
          modules: MODULE_ROWS.map((m) => moduleRow(world, m.module_id)),
          pagination: { next_cursor: null, has_more: false, page_size: MODULE_ROWS.length },
        });
      case "/api/v1/subscription":
        return json({
          ...PLANS[world.plan],
          status: "active",
          current_period_end: null,
          cancel_at_period_end: false,
        });
      case "/api/v1/progress":
        return json({
          modules_completed: world.modules.size,
          total_modules: MODULE_ROWS.length,
          total_xp: 250,
          level: 1,
          current_streak: 1,
          longest_streak: 1,
          recent_activity: [],
        });
      case "/api/v1/gamification":
        return json({
          total_xp: 250,
          level: 1,
          level_title: "Novice",
          xp_to_next_level: 50,
          current_streak: 1,
          longest_streak: 1,
          achievements_earned: 0,
          recent_transactions: [],
        });
      case "/api/v1/gamification/achievements":
        return json({ earned: [], unearned: [] });
      case "/api/v1/usage":
        return json({ plan_name: PLANS[world.plan].plan_name, lesson_completions: 0, quiz_attempts: 0, limits: {} });
      case "/api/v1/community/posts":
        return json({ posts: [], pagination: { next_cursor: null, has_more: false, page_size: 0 } });
      case "/api/v1/profile":
        return json({ user_id: 1, display_name: "Learner", bio: null, country: null, avatar_url: null, created_at: "2026-08-01T12:00:00Z" });
      default:
        return notFound();
    }
  });
}

/**
 * The PRO / SIMPLIFIED control. `:visible` matters: below `lg` the desktop
 * sidebar is still in the DOM (`hidden lg:block`), so a naive locator matches
 * the off-screen copy as well as the one in the drawer.
 */
function experienceSwitch(page: Page) {
  return page.locator('[role="group"][aria-label="Experience"]:visible');
}

/** PRO chrome, on any viewport — sidebar above `lg`, bottom bar below it. */
function proNavigation(page: Page) {
  return page.getByRole("navigation", { name: /^Primary( mobile)?$/ });
}

async function chooseExperience(page: Page, mode: "PRO" | "SIMPLIFIED"): Promise<void> {
  const target = experienceSwitch(page).getByRole("button", { name: new RegExp(`^${mode}$`, "i") });
  // `goto()` resolves before the SPA has mounted, so WAIT for the control
  // rather than probing for it — a bare count() races the first render.
  const mounted = await target
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!mounted) {
    // Below `lg` the control lives in the navigation drawer.
    await page.getByRole("button", { name: /open navigation/i }).click();
  }
  await target.click();
}

/** Walk the guided mission from its first stage to the completion stage. */
async function advanceToFinish(page: Page): Promise<void> {
  // Wait for the mission to mount before driving its stages.
  await expect(page.getByRole("navigation", { name: "Mission stages" })).toBeVisible();
  for (let i = 0; i < 8; i += 1) {
    const next = page.getByRole("button", { name: /^continue$/i });
    if ((await next.count()) === 0 || !(await next.first().isEnabled())) break;
    await next.first().click();
    await page.waitForTimeout(150);
  }
  // The debrief stage. Which heading it carries depends on whether the lesson
  // was ALREADY complete — a finished mission reads "Mission complete" and
  // offers no completion button, which is correct, not a missing control.
  await expect(page.getByText(/ready to complete|mission complete/i)).toBeVisible();
}

/**
 * Seed the device preference the way a returning learner would have it.
 *
 * `addInitScript` re-runs on EVERY document load, so it must not blindly
 * overwrite: doing so would clobber what the app itself persists the moment
 * the test navigates again, and the test would then be asserting against its
 * own fixture rather than the app's behaviour.
 */
async function seedExperience(page: Page, mode: "pro" | "simplified"): Promise<void> {
  await page.addInitScript(
    (seed: { key: string; value: string }) => {
      if (window.localStorage.getItem(seed.key) === null) {
        window.localStorage.setItem(seed.key, seed.value);
      }
    },
    { key: EXPERIENCE_KEY, value: mode },
  );
}

function overflow(page: Page) {
  return page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
}

// ────────────────────────────────────────────────────────────────────────────
// A. Experience switching
// ────────────────────────────────────────────────────────────────────────────
test.describe("Simplified — experience switching", () => {
  test("no stored preference lands on PRO", async ({ page }) => {
    mockBackend(page, newWorld());
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(proNavigation(page).first()).toBeVisible();
    // Nothing is written until the learner chooses.
    expect(await page.evaluate((k) => window.localStorage.getItem(k), EXPERIENCE_KEY)).toBeNull();
  });

  test("PRO → SIMPLIFIED persists across a refresh and a fresh visit to /", async ({ page }) => {
    mockBackend(page, newWorld());
    await page.goto("/dashboard");

    await expect(page.locator("header").getByRole("group", { name: "Experience" })).toBeVisible();
    await expect(page.locator("aside").getByRole("group", { name: "Experience" })).toHaveCount(0);

    await chooseExperience(page, "SIMPLIFIED");
    await expect(page).toHaveURL(/\/simplified$/);
    await expect(page.getByRole("navigation", { name: "Simplified navigation" })).toBeVisible();
    // Switching experiences is not a sign-out.
    await expect(page).not.toHaveURL(/login/);

    // The preference survives a reload…
    await page.reload();
    await expect(page).toHaveURL(/\/simplified$/);
    // …and it is what "/" resolves to.
    await page.goto("/");
    await expect(page).toHaveURL(/\/simplified$/);
    expect(await page.evaluate((k) => window.localStorage.getItem(k), EXPERIENCE_KEY)).toBe("simplified");
  });

  test("SIMPLIFIED → PRO persists and restores PRO chrome", async ({ page }) => {
    mockBackend(page, newWorld());
    await seedExperience(page, "simplified");

    await page.goto("/");
    await expect(page).toHaveURL(/\/simplified$/);

    await chooseExperience(page, "PRO");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(proNavigation(page).first()).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Simplified navigation" })).toHaveCount(0);
    await expect(page).not.toHaveURL(/login/);

    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(await page.evaluate((k) => window.localStorage.getItem(k), EXPERIENCE_KEY)).toBe("pro");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// B + C. Curriculum selection and the mission entry point
// ────────────────────────────────────────────────────────────────────────────
test.describe("Simplified — curriculum and mission", () => {
  test("selects the first incomplete mission of the CURRENT region", async ({ page }) => {
    // SUR-prioritization is done; SUR-kit and WAT-boiling are both open.
    mockBackend(page, newWorld({ modulesDone: ["SUR-prioritization"], lessonsDone: ["SUR-prioritization"] }));
    await page.goto("/simplified");

    await expect(page.getByRole("heading", { name: "Survival Fundamentals" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Building Your Kit" })).toBeVisible();
    // The later region's incomplete mission is NOT chosen.
    await expect(page.getByRole("heading", { name: "Boiling Water for Purification" })).toHaveCount(0);
  });

  test("advances to the next region only once the current one is complete", async ({ page }) => {
    mockBackend(page, newWorld({
      lessonsDone: ["SUR-prioritization", "SUR-kit"],
      modulesDone: ["SUR-prioritization", "SUR-kit"],
    }));
    await page.goto("/simplified");

    // `exact` matters: the mission title below also contains "Water".
    await expect(page.getByRole("heading", { name: "Water", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Boiling Water for Purification" })).toBeVisible();
  });

  test("the CTA enters the current mission directly", async ({ page }) => {
    mockBackend(page, newWorld({ modulesDone: ["SUR-prioritization"], lessonsDone: ["SUR-prioritization"] }));
    await page.goto("/simplified");

    await page.getByRole("link", { name: /mission/i }).first().click();
    await expect(page).toHaveURL(/\/simplified\/missions\/SUR-kit$/);
    // Real lesson content, not a placeholder.
    await expect(page.getByRole("heading", { name: "Introduction" })).toBeVisible();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// D. The field-test gate — completion, on every plan
// ────────────────────────────────────────────────────────────────────────────
for (const plan of ["free", "survivor", "operator"] as const) {
  test.describe(`Simplified — field-test gate (${plan})`, () => {
    test("an INCOMPLETE mission keeps the field test locked", async ({ page }) => {
      mockBackend(page, newWorld({ plan }));
      await page.goto("/simplified/missions/SUR-kit");
      await advanceToFinish(page);

      await expect(page.getByText(/unlocks after completion/i)).toBeVisible();
      // Nothing to click — the gate offers no link at all.
      await expect(page.locator('a[href$="/test"]')).toHaveCount(0);
    });

    test("direct navigation to the field test of an incomplete mission is blocked", async ({ page }) => {
      mockBackend(page, newWorld({ plan }));
      // Counted from BEFORE the navigation, or the first request is missed.
      let quizRequests = 0;
      page.on("request", (r) => {
        if (/\/api\/v1\/quizzes\/[^/]+$/.test(new URL(r.url()).pathname)) quizRequests += 1;
      });

      await page.goto("/simplified/missions/SUR-kit/test");
      await expect(page.getByRole("heading", { name: /field test unlocks after completion/i })).toBeVisible();

      // The questions are never even requested while the mission is locked —
      // the block holds at the network boundary, not just in the markup.
      await page.waitForTimeout(300);
      expect(quizRequests).toBe(0);
    });

    test("a COMPLETED mission opens the field test", async ({ page }) => {
      mockBackend(page, newWorld({ plan, lessonsDone: ["SUR-kit"] }));
      await page.goto("/simplified/missions/SUR-kit");
      await advanceToFinish(page);

      await expect(page.getByText(/unlocks after completion/i)).toHaveCount(0);
      const take = page.getByRole("link", { name: /take field test/i });
      await expect(take).toBeVisible();
      await take.click();

      await expect(page).toHaveURL(/\/simplified\/missions\/SUR-kit\/test$/);
      await expect(page.getByRole("button", { name: /start field test/i })).toBeVisible();
    });
  });
}

// ────────────────────────────────────────────────────────────────────────────
// E. Field test → result, inside Simplified
// ────────────────────────────────────────────────────────────────────────────
test.describe("Simplified — field test result", () => {
  test("completing the field test keeps the learner inside Simplified", async ({ page }) => {
    // SUR-prioritization is done, SUR-kit's lesson is done, so this field test
    // is open — and passing it completes the region.
    mockBackend(page, newWorld({
      lessonsDone: ["SUR-prioritization", "SUR-kit"],
      modulesDone: ["SUR-prioritization"],
    }));
    await page.goto("/simplified/missions/SUR-kit/test");

    await page.getByRole("button", { name: /start field test/i }).click();
    await expect(page.getByRole("radio").first()).toBeVisible();
    await page.getByRole("radio").first().check();
    await page.getByRole("button", { name: /submit test/i }).click();

    // The result hero, unique to QuizResultView.
    await expect(page.getByText("Field test complete")).toBeVisible();
    await expect(page.getByText(/passed/i).first()).toBeVisible();

    // The mission is now complete, so the canonical roadmap advances the
    // learner to the next region — still inside Simplified.
    const next = page.getByRole("link", { name: /next mission/i });
    await expect(next).toBeVisible();
    await expect(next).toHaveAttribute("href", "/simplified/missions/WAT-boiling");

    // No PRO navigation is offered from a Simplified result.
    await expect(page.locator('a[href="/community"]')).toHaveCount(0);
    await expect(page.locator('a[href^="/modules/"]')).toHaveCount(0);
    await expect(page.getByRole("link", { name: /back to mission/i })).toHaveAttribute(
      "href",
      "/simplified/missions/SUR-kit",
    );
    // Retry is preserved for an unsuccessful attempt too — the control is here.
    await expect(page.getByRole("button", { name: /retry quiz/i })).toBeVisible();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// F. Responsive
// ────────────────────────────────────────────────────────────────────────────
for (const [width, height, label] of [
  [375, 812, "small mobile"],
  [414, 896, "large mobile"],
  [768, 1024, "tablet"],
] as const) {
  test(`Simplified — ${label} (${width}px) has no horizontal overflow`, async ({ page }) => {
    mockBackend(page, newWorld({ modulesDone: ["SUR-prioritization"], lessonsDone: ["SUR-prioritization"] }));
    await page.setViewportSize({ width, height });
    await page.goto("/simplified");

    // Wait for the screen to mount before measuring, or the assertion runs
    // against an empty document.
    await expect(page.getByRole("navigation", { name: "Simplified navigation" })).toBeVisible();
    // The roadmap, the CTA and the bottom navigation all stay usable.
    await expect(page.getByRole("link", { name: /mission/i }).first()).toBeVisible();
    await expect(page.getByRole("list", { name: "Mission roadmap" })).toBeVisible();

    const metrics = await overflow(page);
    expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);

    // …and the mission screen itself does not overflow either.
    await page.goto("/simplified/missions/SUR-kit");
    await expect(page.getByRole("navigation", { name: "Mission stages" })).toBeVisible();
    const missionMetrics = await overflow(page);
    expect(missionMetrics.scroll).toBeLessThanOrEqual(missionMetrics.client + 1);
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Route error handling
// ────────────────────────────────────────────────────────────────────────────
test.describe("Simplified — route failure recovery", () => {
  test("a failed lazy chunk renders the recovery screen, not a raw crash", async ({ page }) => {
    mockBackend(page, newWorld());
    // Break the LAZY Simplified barrel at the network boundary — this is
    // exactly the failure that used to surface React Router's raw crash page.
    // Scoped to the barrel on purpose: the shell imports ModeSwitch eagerly
    // from the same folder, and breaking that would take down the whole app
    // rather than one route.
    await page.route("**/src/features/simplified/index.ts*", (route) => route.abort("failed"));

    await page.goto("/simplified");

    await expect(page.getByRole("button", { name: /reload the app/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /back to base camp/i })).toBeVisible();
    // The raw React Router screen is gone for good.
    await expect(page.getByText(/unexpected application error/i)).toHaveCount(0);
    // Recovery is a real way out, not a dead end.
    await page.getByRole("link", { name: /back to base camp/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// G. PRO regression
// ────────────────────────────────────────────────────────────────────────────
test.describe("Simplified — PRO regression", () => {
  test("PRO renders its own chrome and no Simplified chrome", async ({ page }) => {
    mockBackend(page, newWorld());
    await page.goto("/dashboard");

    await expect(proNavigation(page).first()).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Simplified navigation" })).toHaveCount(0);
  });

  test("switching back to PRO restores PRO, and the PRO quiz route is unguarded", async ({ page }) => {
    mockBackend(page, newWorld({ plan: "survivor" }));
    await seedExperience(page, "simplified");
    await page.goto("/simplified");
    await chooseExperience(page, "PRO");
    await expect(page).toHaveURL(/\/dashboard$/);

    // PRO keeps its own quiz-before-lesson policy: a Survivor learner reaches
    // the quiz screen for an unfinished module. The Simplified gate must not
    // have leaked into it.
    await page.goto("/modules/SUR-kit/quiz");
    await expect(page.getByRole("heading", { name: /field test unlocks after completion/i })).toHaveCount(0);
  });
});
