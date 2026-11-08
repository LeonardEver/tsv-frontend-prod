import { expect, test, type Page } from "@playwright/test";

type Language = "en" | "pt-BR" | "es" | "fr" | "de" | "it";
const MODULE = "SUR-emergency-planning";
const entitlements = { daily_lessons: 10, daily_quizzes: 10, resource_download: true, quiz_before_lesson: true, community: true };

async function localizedBackend(page: Page, initial: Language, country: string) {
  let language = initial;
  let signedIn = true;
  let attempts = 0;
  const patches: unknown[] = [];
  const languages: string[] = [];
  const profile = {
    first_name: "Alex", last_name: "Learner", full_name: "Alex Learner", display_name: "Alex Learner", username: null,
    email: "locale@example.com", bio: null, country, timezone: null, preferred_language: language, experience_level: null,
    reminder_preference: "off", learning_goals: null, profile_visibility: "community", avatar_visibility: "community",
    community_display_name: null, member_since: "2026-08-01T12:00:00Z", plan_code: "survivor", plan_name: "Survivor",
  };
  const module = { module_id: MODULE, title: "Household Emergency Planning", description: "A household plan.", category: "survival-fundamentals", subcategory: null, difficulty: "beginner", estimated_duration: 21, content_version: 1, completed: true, progress_pct: 100 };
  const detail = { ...module, knowledge_items: [], lesson: { lesson_id: `${MODULE}-L01`, title: module.title, estimated_minutes: 21, completed: true }, quiz: { quiz_id: `${MODULE}-Q01`, title: "Planning Quiz", question_count: 2, best_score: null, attempt_count: 0 }, resources: [], progress: { lesson_completed: true, quiz_best_score: null, completed: true } };
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request(); const path = new URL(request.url()).pathname.replace("/api/v1", "");
    languages.push(request.headers()["accept-language"] ?? "");
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/auth/me") return signedIn ? json({ user_id: 1, email: profile.email, display_name: profile.display_name, role: "user", country, created_at: profile.member_since, preferred_language: language, language_confirmed_at: "2026-11-08T10:00:00Z" }) : json({ error: { code: "UNAUTHORIZED", message: "Signed out", request_id: "test" } }, 401);
    if (path === "/auth/logout") { signedIn = false; return json({ ok: true }); }
    if (path === "/profile" && request.method() === "PATCH") {
      const patch = request.postDataJSON() as { preferred_language?: Language };
      patches.push(patch); if (patch.preferred_language) language = patch.preferred_language;
      return json({ ...profile, preferred_language: language });
    }
    if (path === "/profile") return json({ ...profile, preferred_language: language });
    if (path === "/categories") return json({ categories: [{ slug: "survival-fundamentals", code: "SUR", title: "Survival Fundamentals", module_count: 1, completed_count: 1 }] });
    if (path === "/modules") return json({ modules: [module], pagination: { next_cursor: null, has_more: false, page_size: 100 } });
    if (path === `/modules/${MODULE}`) return json(detail);
    if (path === "/subscription") return json({ plan_code: "survivor", plan_name: "Survivor", price: 9.9, currency: "usd", billing_period: "month", status: "active", started_at: profile.member_since, current_period_started_at: profile.member_since, renews_at: null, ends_at: null, canceled_at: null, cancel_at_period_end: false, provider: null, entitlements });
    if (path === "/usage") return json({ plan_code: "survivor", plan_name: "Survivor", date: "2026-11-08", timezone: "UTC", lesson_completions: 1, quiz_attempts: 0, limits: { daily_lessons: 10, daily_quizzes: 10 } });
    if (path === "/gamification") return json({ total_xp: 125, level: 1, level_title: "Novice", xp_to_next_level: 175, current_streak: 1, longest_streak: 1, achievements_earned: 0, recent_transactions: [] });
    if (path === "/gamification/achievements") return json({ earned: [], unearned: [] });
    if (path === "/progress") return json({ total_modules: 1, modules_completed: 1, completion_pct: 100, current_streak: 1, longest_streak: 1, recent_activity: [] });
    if (path === `/progress/modules/${MODULE}`) return json({ module_id: MODULE, lesson_completed: true, quiz_best_score: null, quiz_attempts: 0, lo_performance: [] });
    if (path === `/lessons/${MODULE}-L01`) return json({ lesson_id: `${MODULE}-L01`, module_id: MODULE, title: module.title, content_version: 1, estimated_minutes: 21, sections: [{ type: "introduction", heading: "Introduction", content: "Make a plan." }, { type: "recap", heading: "Recap", content: "Review it." }], progress: { completed: true, last_position: 0 }, localization: { requested_locale: request.headers()["accept-language"], content_locale: "en", fallback: true, missing_count: 1, reasons: ["missing"], artifact_locale: null } });
    if (path === `/quizzes/${MODULE}-Q01`) return json({ quiz_id: `${MODULE}-Q01`, module_id: MODULE, title: "Planning Quiz", question_count: 2, passing_score: 0.7, previous_attempts: [], questions: [1, 2].map((number) => ({ question_id: `q0${number}`, question_type: "multiple_choice", question_text: `Planning question ${number}`, difficulty: "beginner", options: [{ label: "A", text: "A written plan" }, { label: "B", text: "No plan" }] })) });
    if (path === `/quizzes/${MODULE}-Q01/attempts` && request.method() === "POST") { attempts++; return json({ attempt_id: 1, quiz_id: `${MODULE}-Q01`, status: "in_progress", started_at: "2026-11-08T10:00:00Z", content_version: 1 }, 201); }
    if (path === "/community/posts") return json({ posts: [], pagination: { next_cursor: null, has_more: false, page_size: 20 } });
    return json({ error: { code: "FORBIDDEN", message: "Not available in fixture", request_id: "test" } }, 403);
  });
  return { patches, languages, attempts: () => attempts };
}

for (const scenario of [
  { country: "DE", browser: "de-DE", language: "pt-BR", heading: "Explorar Regiões" },
  { country: "BR", browser: "pt-BR", language: "en", heading: "Explore Regions" },
  { country: "US", browser: "en-US", language: "es", heading: "Explorar regiones" },
] as const) {
  test(`${scenario.country}: confirmed ${scenario.language} overrides browser and local suggestion`, async ({ page }) => {
    await page.addInitScript(({ browser }) => { Object.defineProperty(navigator, "languages", { get: () => [browser] }); localStorage.setItem("survival-academy-language", "it"); }, scenario);
    const backend = await localizedBackend(page, scenario.language, scenario.country);
    await page.goto("/categories");
    await expect(page.getByRole("heading", { name: scenario.heading, exact: true })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", scenario.language);
    await expect(page.locator("#pf-language")).toHaveCount(0);
    expect(backend.languages).toContain(scenario.language);
  });
}

test("profile change preserves draft and URL, persists after reload and uses both experiences", async ({ page }, info) => {
  const backend = await localizedBackend(page, "en", "BR");
  await page.goto("/profile");
  await page.locator("#pf-full-name").fill("Unsaved draft");
  await page.locator("#pf-language").selectOption("de");
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.getByRole("button", { name: "Profil speichern", exact: true })).toBeVisible();
  await expect(page.locator("#pf-full-name")).toHaveValue("Unsaved draft");
  await expect(page).toHaveURL(/\/profile$/);
  await expect.poll(() => backend.patches.length).toBe(1);
  expect(backend.patches).toEqual([{ preferred_language: "de" }]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.evaluate(() => { window.scrollTo(0, 0); });
  await page.screenshot({ path: `visual-review/i18n/profile-de-${info.project.name}.png`, fullPage: true });
  await page.reload();
  await expect(page.locator("#pf-language")).toHaveValue("de");
  await page.goto("/simplified");
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.locator("#pf-language")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

for (const language of ["fr", "it"] as const) {
  test(`${language}: profile expansion and instructional fallback stay usable`, async ({ page }, info) => {
    await localizedBackend(page, language, "DE");
    await page.goto("/profile");
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    await expect(page.locator("#pf-language")).toHaveValue(language);
    await expect(page.locator("h1")).toHaveText(language === "fr" ? "Profil" : "Profilo");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `visual-review/i18n/profile-${language}-${info.project.name}.png` });
    await page.goto(`/modules/${MODULE}/lesson`);
    await expect(page.getByRole("note")).toBeVisible();
    await expect(page.locator("#pf-language")).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await expect(page).toHaveURL(new RegExp(`/modules/${MODULE}/lesson$`));
  });
}

test("changing the shared locale retains the active quiz question, answers and attempt", async ({ page }) => {
  const backend = await localizedBackend(page, "en", "US");
  await page.goto(`/modules/${MODULE}/quiz`);
  await page.getByRole("button", { name: /start field test/i }).click();
  await page.getByText("A written plan", { exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Planning question 2", { exact: true })).toBeVisible();
  await page.evaluate(() => { window.dispatchEvent(new StorageEvent("storage", { key: "survival-academy-language", newValue: "fr" })); });
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.getByText("Planning question 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Précédent", exact: true }).click();
  await expect(page.getByRole("radio", { name: /A written plan/ })).toBeChecked();
  expect(backend.attempts()).toBe(1);
  await expect(page).toHaveURL(new RegExp(`/modules/${MODULE}/quiz$`));
});
