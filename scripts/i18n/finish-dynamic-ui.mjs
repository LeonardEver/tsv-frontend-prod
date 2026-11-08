import { readFile, writeFile } from "node:fs/promises";
async function edit(file, transform) { const original = await readFile(file, "utf8"); await writeFile(file, transform(original)); }
await edit("src/features/gamification/rewards-presenter.ts", (text) => text.replace(".map((title, index)", ".map((_, index)"));
for (const file of ["src/features/gamification/index.tsx", "src/features/dashboard/index.tsx", "src/features/progress/index.tsx", "src/components/layout/AppShell.tsx"]) {
  await edit(file, (text) => {
    if (file.includes("gamification/index")) text = text.replace("nextRankTarget, rankName, visibleRanks", "nextRankTarget, rankName, rankTitle, visibleRanks");
    else text = 'import { rankTitle } from "@/features/gamification/rewards-presenter";\n' + text;
    text = text.replaceAll("{summary.level_title}", "{rankTitle(summary.level, summary.level_title)}").replaceAll("? summary.level_title :", "? rankTitle(summary.level, summary.level_title) :");
    text = text.replace("hint={summary.level_title}", "hint={rankTitle(summary.level, summary.level_title)}");
    text = text.replace("hint={summary?.level_title ??", "hint={summary ? rankTitle(summary.level, summary.level_title) :");
    text = text.replace('statusParts.push(`Level ${gamificationQuery.data.level}`, gamificationQuery.data.level_title);', 'statusParts.push(uiText("settings:level_value_c5bf02", { value0: gamificationQuery.data.level }), rankTitle(gamificationQuery.data.level, gamificationQuery.data.level_title));');
    text = text.replace('value={`${summary.current_streak} ${summary.current_streak === 1 ? "day" : "days"}`}', 'value={uiText("common:days", { count: summary.current_streak })}');
    text = text.replace('value1: uiValue(summary.longest_streak === 1 ? "day" : "days")', 'value1: uiValue(summary.longest_streak === 1 ? uiText("rewards:day_a2620c") : uiText("rewards:days_5548ae"))');
    text = text.replace('value={`${overview.current_streak} ${overview.current_streak === 1 ? "day" : "days"}`}', 'value={uiText("common:days", { count: overview.current_streak })}');
    text = text.replace('value1: uiValue(overview.longest_streak === 1 ? "day" : "days")', 'value1: uiValue(overview.longest_streak === 1 ? uiText("rewards:day_a2620c") : uiText("rewards:days_5548ae"))');
    text = text.replace('uiText("progress:quiz_value_value_attemptvalue_607c68", { value0: uiValue(data.quiz_best_score === null ? "—" : formatScorePct(data.quiz_best_score)), value1: uiValue(data.quiz_attempts), value2: uiValue(data.quiz_attempts === 1 ? "" : "s") })', 'uiText("progress:quizAttempts", { score: data.quiz_best_score === null ? "—" : formatScorePct(data.quiz_best_score), attempts: uiText("common:attempts", { count: data.quiz_attempts }) })');
    text = text.replace('uiText("progress:value_best_quiz_score_value_value_attemptvalue_77d281", { value0: uiValue(mod.title), value1: uiValue(formatScorePct(data.quiz_best_score)), value2: uiValue(data.quiz_attempts), value3: uiValue(data.quiz_attempts === 1 ? "" : "s") })', 'uiText("progress:bestQuizAttempts", { title: mod.title, score: formatScorePct(data.quiz_best_score), attempts: uiText("common:attempts", { count: data.quiz_attempts }) })');
    text = text.replace('uiText("progress:value_attemptvalue_e7d332", { value0: uiValue(data.quiz_attempts), value1: uiValue(data.quiz_attempts === 1 ? "" : "s") })', 'uiText("common:attempts", { count: data.quiz_attempts })');
    return text;
  });
}
await edit("src/features/quiz/QuestionCard.tsx", (text) => text.replace('uiValue(answered ? ", answered" : ", unanswered")', 'uiValue(answered ? uiText("learning:answered_3cabd3") : uiText("learning:unanswered_80b9fb"))'));
await edit("src/features/quiz/index.tsx", (text) => text.replace('uiText("learning:value_questionvalue_no_time_limit_a75d23", { value0: uiValue(quiz.question_count), value1: uiValue(quiz.question_count === 1 ? "" : "s") })', 'uiText("learning:noTimeQuestions", { questions: uiText("common:questions", { count: quiz.question_count }) })'));
await edit("src/app/landing/LandingPage.tsx", (text) => text.replaceAll('/ month</span>', '{uiText("public:monthSuffix")}</span>'));
