/**
 * Tester Feature Firestore Document Types & Constants
 *
 * Two distinct collections, deliberately separate:
 *  - TesterChecklistItemDocument — the admin-authored catalog of test cases (mirrors FAQs).
 *  - TesterChecklistResponseDocument — one doc per (tester, case) answer, upserted by testerId+checklistItemId.
 */

import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import { generateChecklistItemId } from "../../../utils/id-generators";

// --- Checklist item (catalog) -------------------------------------------------

export interface TesterChecklistItemDocument extends BaseDocument {
  groupKey: string; // top-level accordion group, e.g. "buying", "selling", "design"
  groupLabel: string; // denormalized display label for the group
  pageKey: string; // sub-accordion within the group, e.g. "checkout"
  pageLabel: string;
  label: string; // the actual Yes/No question, e.g. "Google OAuth sign-in works"
  description?: string;
  href?: string; // deep link to the real feature being tested
  order: number;
  // Admin-assigned test batch (1-based) — lets a tester work through ~10-50
  // cases per session instead of the full catalog at once. Independent of
  // groupKey/pageKey: a phase can span multiple groups, or one large group
  // can span multiple phases. Initial values are computed by
  // assignDefaultPhases() (utils/phases.ts) at seed time; admins can
  // re-assign per item afterward via the catalog editor.
  phase: number;
  isActive: boolean;
  searchTokens: string[];
  // true = only shown to isTester && canTestAdmin testers (or real admins) —
  // gates cases that exercise /admin/** areas.
  adminOnly?: boolean;
  // --- Bug hunter rewards (confirm-bug + reopen-for-retest flow) ---
  // Set once by confirmBug() and never touched again by reopenAsNewVersion() —
  // credit is permanent regardless of how many times the case is later reopened.
  bugConfirmed?: boolean;
  bugHunterId?: string;
  bugHunterName?: string;
  bugConfirmedAt?: Date;
  // Retest lifecycle: reopenAsNewVersion() creates a new item with version+1 and
  // previousVersionId pointing back here; this (old, disabled) item then gets
  // supersededByItemId pointing forward to the new one.
  version?: number;
  previousVersionId?: string;
  supersededByItemId?: string;
}

export const TESTER_CHECKLIST_ITEM_COLLECTION = "testerChecklistItems" as const;
export const TESTER_CHECKLIST_ITEM_ID_PREFIX = "checklist-" as const;

export const TESTER_CHECKLIST_ITEM_INDEXED_FIELDS = [
  "groupKey",
  "pageKey",
  "phase",
  "order",
  "isActive",
  "searchTokens",
  "createdAt",
] as const;

export const DEFAULT_TESTER_CHECKLIST_ITEM_DATA: Partial<TesterChecklistItemDocument> = {
  order: 0,
  phase: 1,
  isActive: true,
  searchTokens: [],
  adminOnly: false,
};

export type TesterChecklistItemCreateInput = Omit<
  TesterChecklistItemDocument,
  "id" | "createdAt" | "updatedAt" | "searchTokens"
>;

export type TesterChecklistItemUpdateInput = Partial<
  Pick<
    TesterChecklistItemDocument,
    | "groupKey"
    | "groupLabel"
    | "pageKey"
    | "pageLabel"
    | "label"
    | "description"
    | "href"
    | "order"
    | "phase"
    | "isActive"
    | "adminOnly"
    | "bugConfirmed"
    | "bugHunterId"
    | "bugHunterName"
    | "bugConfirmedAt"
    | "version"
    | "previousVersionId"
    | "supersededByItemId"
  >
>;

export const testerChecklistItemQueryHelpers = {
  byGroup: (groupKey: string) => ["groupKey", "==", groupKey] as const,
  byPage: (pageKey: string) => ["pageKey", "==", pageKey] as const,
  active: () => ["isActive", "==", true] as const,
  confirmedBugs: () => ["bugConfirmed", "==", true] as const,
} as const;

export interface BugHunterLeaderboardEntry {
  rank: number;
  hunterId: string;
  hunterName: string;
  bugCount: number;
}

export function slugifyChecklistLabel(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function createChecklistItemId(groupKey: string, pageKey: string, label: string): string {
  return generateChecklistItemId({ groupKey, pageKey, label });
}

// --- Checklist response (tester answers) --------------------------------------

export type TesterAnswer = "yes" | "no";
export type TesterFeedbackStatus = "new" | "reviewed";

export interface TesterChecklistResponseDocument extends BaseDocument {
  testerId: string;
  testerDisplayName: string;
  checklistItemId: string; // FK -> TesterChecklistItemDocument.id
  groupKey: string; // denormalized from the item at answer-time, for report grouping without a join
  pageKey: string;
  phase: number; // denormalized from the item at answer-time, same reason
  answer: TesterAnswer | null; // null = not yet answered
  comment?: string;
  screenshotUrl?: string;
  status: TesterFeedbackStatus; // admin triage, reset to "new" on any tester change
}

export const TESTER_CHECKLIST_RESPONSE_COLLECTION = "testerChecklistResponses" as const;

export const TESTER_CHECKLIST_RESPONSE_INDEXED_FIELDS = [
  "testerId",
  "checklistItemId",
  "groupKey",
  "pageKey",
  "phase",
  "answer",
  "status",
  "createdAt",
] as const;

export const DEFAULT_TESTER_CHECKLIST_RESPONSE_DATA: Partial<TesterChecklistResponseDocument> = {
  answer: null,
  status: "new",
};

export function createChecklistResponseId(testerId: string, checklistItemId: string): string {
  return `${testerId}__${checklistItemId}`;
}

export const testerChecklistResponseQueryHelpers = {
  byTester: (testerId: string) => ["testerId", "==", testerId] as const,
  byItem: (checklistItemId: string) => ["checklistItemId", "==", checklistItemId] as const,
  byPhase: (phase: number) => ["phase", "==", phase] as const,
  byAnswer: (answer: TesterAnswer) => ["answer", "==", answer] as const,
  byStatus: (status: TesterFeedbackStatus) => ["status", "==", status] as const,
} as const;

// --- Field name constants -----------------------------------------------------

export const TESTER_CHECKLIST_ITEM_FIELDS = {
  ID: "id",
  GROUP_KEY: "groupKey",
  GROUP_LABEL: "groupLabel",
  PAGE_KEY: "pageKey",
  PAGE_LABEL: "pageLabel",
  LABEL: "label",
  DESCRIPTION: "description",
  HREF: "href",
  ORDER: "order",
  PHASE: "phase",
  IS_ACTIVE: "isActive",
  SEARCH_TOKENS: "searchTokens",
  ADMIN_ONLY: "adminOnly",
  BUG_CONFIRMED: "bugConfirmed",
  BUG_HUNTER_ID: "bugHunterId",
  BUG_HUNTER_NAME: "bugHunterName",
  BUG_CONFIRMED_AT: "bugConfirmedAt",
  VERSION: "version",
  PREVIOUS_VERSION_ID: "previousVersionId",
  SUPERSEDED_BY_ITEM_ID: "supersededByItemId",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
} as const;

export const TESTER_CHECKLIST_RESPONSE_FIELDS = {
  ID: "id",
  TESTER_ID: "testerId",
  TESTER_DISPLAY_NAME: "testerDisplayName",
  CHECKLIST_ITEM_ID: "checklistItemId",
  GROUP_KEY: "groupKey",
  PAGE_KEY: "pageKey",
  PHASE: "phase",
  ANSWER: "answer",
  COMMENT: "comment",
  SCREENSHOT_URL: "screenshotUrl",
  STATUS: "status",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
} as const;
