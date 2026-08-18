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
  isActive: boolean;
  searchTokens: string[];
  // true = only shown to isTester && canTestAdmin testers (or real admins) —
  // gates cases that exercise /admin/** areas.
  adminOnly?: boolean;
}

export const TESTER_CHECKLIST_ITEM_COLLECTION = "testerChecklistItems" as const;
export const TESTER_CHECKLIST_ITEM_ID_PREFIX = "checklist-" as const;

export const TESTER_CHECKLIST_ITEM_INDEXED_FIELDS = [
  "groupKey",
  "pageKey",
  "order",
  "isActive",
  "searchTokens",
  "createdAt",
] as const;

export const DEFAULT_TESTER_CHECKLIST_ITEM_DATA: Partial<TesterChecklistItemDocument> = {
  order: 0,
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
    | "isActive"
    | "adminOnly"
  >
>;

export const testerChecklistItemQueryHelpers = {
  byGroup: (groupKey: string) => ["groupKey", "==", groupKey] as const,
  byPage: (pageKey: string) => ["pageKey", "==", pageKey] as const,
  active: () => ["isActive", "==", true] as const,
} as const;

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
  IS_ACTIVE: "isActive",
  SEARCH_TOKENS: "searchTokens",
  ADMIN_ONLY: "adminOnly",
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
  ANSWER: "answer",
  COMMENT: "comment",
  SCREENSHOT_URL: "screenshotUrl",
  STATUS: "status",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
} as const;
