/**
 * Module detail — the learning entry point.
 *
 * THE product-rule test: the Quiz is reachable WITHOUT completing the
 * Lesson. The quiz action must always exist, be enabled, and link
 * directly to the quiz — never gated, grayed, or redirected (DEC-022).
 */
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { renderAtRoute } from "@/test/render";
import { moduleDetailFixture } from "@/test/msw/handlers";
import ModuleDetailPage from "./ModuleDetail";

const API = "*/api/v1";

describe("ModuleDetailPage", () => {
  it("renders title, metadata, knowledge items and resources", async () => {
    renderAtRoute(<ModuleDetailPage />, "/modules/WAT-boiling", "/modules/:moduleId");
    await waitFor(() =>
      { expect(
        screen.getByRole("heading", { name: "Boiling Water for Purification" }),
      ).toBeInTheDocument(); },
    );
    expect(screen.getByText("Beginner")).toBeInTheDocument();
    expect(screen.getByText(/boiling times by altitude/i)).toBeInTheDocument();
    // Field-resource row: the Open action links to the resource page and
    // the row carries the authoritative type and format.
    const resourceLink = screen.getByRole("link", { name: /^open$/i });
    expect(resourceLink).toHaveAttribute("href", "/resources/WAT-boiling-R01");
    expect(screen.getByText("checklist")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /field resources/i })).toBeInTheDocument();
  });

  it("PRODUCT RULE: the quiz is always available, even with the lesson unfinished", async () => {
    // Fixture state: lesson.completed = false, no attempts.
    renderAtRoute(<ModuleDetailPage />, "/modules/WAT-boiling", "/modules/:moduleId");
    await waitFor(() =>
      { expect(screen.getByRole("heading", { name: "Boiling Water for Purification" })).toBeInTheDocument(); },
    );

    const quizLink = screen.getByRole("link", { name: /take field test/i });
    expect(quizLink).toHaveAttribute("href", "/modules/WAT-boiling/quiz");
    // NOT disabled, NOT grayed, no "Complete lesson first" anywhere.
    expect(quizLink).not.toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByText(/complete.*lesson.*first/i)).not.toBeInTheDocument();

    // The lesson path exists in parallel.
    expect(screen.getByRole("link", { name: /start field manual/i })).toHaveAttribute(
      "href",
      "/modules/WAT-boiling/lesson",
    );
  });

  it("reflects authoritative progress verbatim", async () => {
    renderAtRoute(<ModuleDetailPage />, "/modules/WAT-boiling", "/modules/:moduleId");
    await waitFor(() =>
      { expect(
        // AUTHORITY FIXTURE: the backend's progress_pct (73) is rendered
        // verbatim — never recomputed from lesson/quiz state.
        screen.getByText(/73% complete/i),
      ).toBeInTheDocument(); },
    );
    // No quiz attempts recorded — the card surfaces the null best score.
    expect(screen.getByText(/best score: —/i)).toBeInTheDocument();
    // The related completed mission carries its own authoritative 100%.
    expect(screen.getByText(/100% complete/i)).toBeInTheDocument();
  });

  it("adapts entry labels to completed state without inventing values", async () => {
    const completedModule = {
      ...moduleDetailFixture,
      lesson: moduleDetailFixture.lesson
        ? { ...moduleDetailFixture.lesson, completed: true }
        : null,
      quiz: moduleDetailFixture.quiz
        ? { ...moduleDetailFixture.quiz, best_score: 85, attempt_count: 2 }
        : null,
      progress: { lesson_completed: true, quiz_best_score: 85, completed: true },
    };
    server.use(
      http.get(`${API}/modules/WAT-boiling`, () => HttpResponse.json(completedModule)),
    );
    renderAtRoute(<ModuleDetailPage />, "/modules/WAT-boiling", "/modules/:moduleId");
    await waitFor(() =>
      { expect(screen.getByRole("link", { name: /review field manual/i })).toBeInTheDocument(); },
    );
    expect(screen.getByRole("link", { name: /take field test again/i })).toBeInTheDocument();
    expect(screen.getByText(/best score: 85%/i)).toBeInTheDocument();
    // The completed state is communicated by the related completed
    // mission's authoritative progress.
    expect(screen.getByText(/100% complete/i)).toBeInTheDocument();
  });

  it("surfaces unknown modules as not available", async () => {
    renderAtRoute(<ModuleDetailPage />, "/modules/WAT-unknown", "/modules/:moduleId");
    await waitFor(() =>
      { expect(screen.getByText(/this content isn't available/i)).toBeInTheDocument(); },
    );
  });
});
