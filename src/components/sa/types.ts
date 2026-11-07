/**
 * SURVIVAL ACADEMY — visual props contract (Phase 23, adapted from the
 * Lovable reference `src/lib/sa/types.ts`).
 *
 * These types describe the *shape of props* the sa/ visual components
 * expect. They are NOT a data model and contain no business rules —
 * feature layers map real API responses into these shapes via small
 * adapters. Presentation decisions (entitlements, limits, routes) are
 * passed in as props.
 */
import type { LucideIcon } from "lucide-react";

export type Difficulty = "Beginner" | "Intermediate" | "Advanced";
export type MissionStatus = "locked" | "available" | "in-progress" | "complete";

export interface CategoryCardModel {
  /** Authoritative backend category code (drives color + image). */
  code: string;
  /** Backend category slug — the route param. */
  slug: string;
  name: string;
  tagline: string;
  description: string;
  missions: number;
  completed: number;
  /** Generated artwork asset; null → icon identity fallback. */
  image: string | null;
  /** Region mark used when no image is registered. */
  Icon: LucideIcon;
}

export interface MissionCardModel {
  moduleId: string;
  categoryCode: string;
  subcategory: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  minutes: number;
  progress: number;
  status: MissionStatus;
  image: string | null;
  /** Module detail route (react-router target). */
  to: string;
}

export interface FieldResourceModel {
  resourceId: string;
  title: string;
  kind: string;
  format: string;
  description: string;
  categoryCode: string;
  available: boolean;
}

export interface AchievementModel {
  id: string;
  name: string;
  description: string;
  earned: boolean;
  earnedAt?: string | undefined;
}

export interface CommunityPostModel {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  category: string;
  votes: number;
  comments: number;
  time: string;
  own: boolean;
}
