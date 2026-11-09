import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { moduleDetailFixture, lessonFixture, testUser, categoriesFixture } from "@/test/msw/handlers";
import { renderAtRoute } from "@/test/render";
import LessonPage from "@/features/lesson";
import { changeLocale } from "./index";
import type { Locale } from "./config";

const root = "docs/i18n/content/";
interface RecordFields { entity_type: string; entity_id: string; localized_fields: { title: string; sections: typeof lessonFixture.sections }; }
const source = JSON.parse(readFileSync(root + "source.json", "utf8")) as { sources: Array<{ entity_type: string; entity_id: string; source_fields: { sections: typeof lessonFixture.sections } }> };
afterEach(async () => { await changeLocale("en"); });

describe("real curriculum lesson localization", () => {
  it.each(["pt-BR", "es", "fr", "de", "it"] as Locale[])("renders the reported lesson's actual headings AND objective descriptions in %s", async (locale) => {
    window.scrollTo = vi.fn();
    await changeLocale(locale);
    const pack = JSON.parse(readFileSync(root + locale + ".json", "utf8")) as { records: RecordFields[] };
    const lesson = pack.records.find((record) => record.entity_type === "lesson" && record.entity_id === "SUR-emergency-planning-L01");
    if (!lesson) throw new Error("Real lesson translation missing");
    const metadata = { requested_locale: locale, content_locale: locale, fallback: false, missing_count: 0, reasons: [], artifact_locale: null, review_pending: true };
    const title = lesson.localized_fields.title;
    const mod = { ...moduleDetailFixture, module_id: "SUR-emergency-planning", title, category: "survival-fundamentals", resources: [], lesson: { ...moduleDetailFixture.lesson, lesson_id: lesson.entity_id, title }, localization: metadata };
    server.use(
      http.get("*/api/v1/auth/me", () => HttpResponse.json({ ...testUser, preferred_language: locale, language_confirmed_at: "2026-11-08T12:00:00Z" })),
      http.get("*/api/v1/modules/SUR-emergency-planning", () => HttpResponse.json(mod)),
      http.get("*/api/v1/lessons/SUR-emergency-planning-L01", () => HttpResponse.json({ ...lessonFixture, ...lesson.localized_fields, lesson_id: lesson.entity_id, module_id: mod.module_id, localization: metadata })),
      http.get("*/api/v1/categories", () => HttpResponse.json({ ...categoriesFixture, localization: metadata })),
    );
    renderAtRoute(<LessonPage />, "/modules/SUR-emergency-planning/lesson", "/modules/:moduleId/lesson");
    await waitFor(() => { expect(screen.getByRole("heading", { name: title })).toBeVisible(); });
    for (const section of lesson.localized_fields.sections.filter((item) => item.type !== "learning_objectives")) expect(screen.getByRole("heading", { name: section.heading })).toBeVisible();
    const objectives = lesson.localized_fields.sections.find((section) => section.type === "learning_objectives")?.items ?? [];
    expect(objectives).toHaveLength(6);
    for (const objective of objectives) expect(screen.getByText(objective.description)).toBeVisible();
    const english = source.sources.find((record) => record.entity_type === "lesson" && record.entity_id === lesson.entity_id)?.source_fields.sections.find((section) => section.type === "learning_objectives")?.items ?? [];
    for (const objective of english) expect(screen.queryByText(objective.description)).toBeNull();
  });
});
