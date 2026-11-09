import { afterEach, describe, expect, it } from "vitest";
import { act, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { submissionResultFixture } from "@/test/msw/handlers";
import { renderAtRoute } from "@/test/render";
import { QuizResultView } from "@/features/quiz/QuizResultView";
import { changeLocale, useLocale } from "./index";

afterEach(async () => { await changeLocale("en"); });

describe("language changes on an already submitted quiz", () => {
  it("refreshes explanations while preserving the original score and earned XP receipt", async () => {
    await changeLocale("en");
    const receipt = { ...submissionResultFixture, xp_earned: 75 };
    const translated = { ...receipt, xp_earned: 0, results: receipt.results.map((row) => ({ ...row, explanation: "Explicação localizada: " + row.question_id })), localization: { requested_locale: "pt-BR", content_locale: "pt-BR", fallback: false, missing_count: 0, reasons: [], artifact_locale: null } };
    server.use(http.get("*/api/v1/quizzes/WAT-boiling-Q01/attempts/1", () => HttpResponse.json(translated)));
    function Result() {
      const locale = useLocale();
      return <QuizResultView moduleId="WAT-boiling" quizId="WAT-boiling-Q01" quizTitle={locale === "en" ? "Boiling quiz" : "Quiz de fervura"} result={receipt} onRetry={() => {}} />;
    }
    renderAtRoute(<Result />, "/modules/WAT-boiling/quiz/result/1");
    expect(screen.getByText(/Boiling kills all biological pathogens/)).toBeVisible();
    await act(async () => { await changeLocale("pt-BR"); });
    expect(await screen.findByText("Explicação localizada: q01")).toBeVisible();
    expect(screen.queryByText(/Boiling kills all biological pathogens/)).toBeNull();
    expect(screen.getByText(/75 XP/)).toBeVisible();
    expect(screen.getAllByText("67%")[0]).toBeVisible();
  });
});
