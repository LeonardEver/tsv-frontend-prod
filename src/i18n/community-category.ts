import { tr } from "./index";

/** Seeded topic taxonomy is display metadata. User-authored posts and comments
 * retain the author's language, and category codes remain unchanged. */
const topics = {
  general: ["General", "topicGeneral"], water: ["Water", "topicWater"], fire: ["Fire", "topicFire"],
  shelter: ["Shelter", "topicShelter"], food: ["Food", "topicFood"], agriculture: ["Agriculture", "topicAgriculture"],
  medical: ["Medical", "topicMedical"], navigation: ["Navigation", "topicNavigation"], gear: ["Gear", "topicGear"],
  "off-grid": ["Off-grid", "topicOffGrid"], "survival-stories": ["Survival Stories", "topicStories"], questions: ["Questions", "topicQuestions"],
} as const;
export function communityCategoryTitle(code: string, canonicalName: string): string {
  if (!Object.hasOwn(topics, code)) return canonicalName;
  const topic = topics[code as keyof typeof topics];
  if (canonicalName !== topic[0]) return canonicalName;
  return tr(`community:${topic[1]}`);
}
