import { readFile, writeFile } from "node:fs/promises";
const extra = {
  authentication: { termsAgreement: "I agree to the <policy>Terms of Service</policy>", privacyAgreement: "I acknowledge the <policy>Privacy Policy</policy>" },
  common: {
    englishFileFallback: "The downloadable file is currently available in English.",
    passwordLower: "Password must include at least one lowercase letter.", passwordUpper: "Password must include at least one uppercase letter.", passwordNumber: "Password must include at least one number.", passwordSpecial: "Password must include at least one special character.", passwordMin: "Password must be at least 12 characters long.", passwordMax: "Password must be at most 128 characters long.",
    completedMissions_one: "{{count}} mission complete", completedMissions_other: "{{count}} missions complete", streak_one: "{{count}} day streak", streak_other: "{{count}} day streak",
    attempts_one: "{{count}} attempt", attempts_other: "{{count}} attempts",
    questions_one: "{{count}} question", questions_other: "{{count}} questions",
    missions_one: "{{count}} mission", missions_other: "{{count}} missions",
    comments_one: "{{count}} comment", comments_other: "{{count}} comments",
    rankNovice: "Novice", rankPrepared: "Prepared", rankPractitioner: "Practitioner", rankSkilled: "Skilled", rankExpert: "Expert", rankMaster: "Master", rankGrandmaster: "Grandmaster", rankLegend: "Legend", rankMythic: "Mythic", rankTranscendent: "Transcendent",
    invalidValue: "Please check this field.", requiredField: "This field is required.", invalidEmail: "Enter a valid email address.", invalidBirthDate: "Enter a valid date of birth.", futureBirthDate: "Date of birth cannot be in the future.", minimumAge: "You must be at least {{age}} years old to create an account.", invalidCountry: "Select a valid country or region.", maxCharacters: "Must be at most {{count}} characters.", invalidCharacters: "Must not contain control characters.", acceptTerms: "You must agree to the Terms of Service.", acceptPrivacy: "You must acknowledge the Privacy Policy.", passwordPolicy: "Your password must meet all the requirements shown below.", passwordMismatch: "Passwords don't match.",
  },
  public: { monthSuffix: "/ month", seoTitle: "Survival Academy — Train for the real world", seoDescription: "Survival Academy turns essential preparedness skills into a clear, motivating field curriculum." },
  subscriptions: { planActiveUntil: "{{plan}} stays active until {{date}}.", planWillEnd: "Your plan will end at the period end.", cancelDetail: "{{plan}} stays active until {{date}}. You won't be charged again.", nextPayment: "Next payment on {{date}}.", activeDetail: "Subscription is active.", trialStarts: "Paid period starts {{date}}.", trialDetail: "Trial active.", updatePayment: "Your payment method needs attention. Update it to keep full access.", incompletePayment: "Your payment hasn't been completed yet.", unpaidDetail: "Payment failed after retries — paid features are paused.", endedDetail: "The subscription has ended. Choose a plan to come back.", unknownStatus: "Status unavailable" },
  learning: { resourceChecklist: "Checklist", resourceGuide: "Guide", resourceTable: "Table", resourceMap: "Map", resourceTemplate: "Template", resourceWorksheet: "Worksheet", resourceOther: "Resource", resourceExternal: "External source", resourceReady: "Ready", resourceNotGenerated: "Not yet generated", redistributionAllowed: "Allowed", redistributionRestricted: "Restricted", redistributionNotAllowed: "Not allowed", redistributionUnknown: "Unknown", stageContext: "Context", stageLearn: "Learn", stagePractice: "Practice", stageApply: "Apply", stageComplete: "Complete", uncharted: "Uncharted region", developing: "New region — content in development.", noTimeQuestions: "{{questions}} · no time limit" },
  community: { topicGeneral: "General", topicWater: "Water", topicFire: "Fire", topicShelter: "Shelter", topicFood: "Food", topicAgriculture: "Agriculture", topicMedical: "Medical", topicNavigation: "Navigation", topicGear: "Gear", topicOffGrid: "Off-grid", topicStories: "Survival Stories", topicQuestions: "Questions" },
  progress: { quizAttempts: "Quiz: {{score}} · {{attempts}}", bestQuizAttempts: "{{title}} · Best quiz score: {{score}} · {{attempts}}" },
};
for (const [ns, entries] of Object.entries(extra)) {
  const file = `src/i18n/locales/en/${ns}.json`;
  const current = JSON.parse(await readFile(file, "utf8"));
  await writeFile(file, JSON.stringify({ ...current, ...entries }, null, 2) + "\n");
}
