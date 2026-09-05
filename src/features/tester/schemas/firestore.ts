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
  /* ── The six-part case contract ────────────────────────────────────────────
   *
   * A one-line label asks every reader to invent the procedure, so two testers
   * invent two different ones. An automated tester is worse: it guesses what
   * "check the offer flow works" means and will happily guess something trivial
   * and pass. These six fields remove the guessing, and each catches a failure
   * the others miss.
   */

  /**
   * WHICH ROLES this case affects. Not decoration — it changes what "correct" means.
   *
   * The same page is a different page per role: /products/<slug> shows a buyer
   * Add to Cart and Make Offer, shows the OWNING seller Edit listing and no Make
   * Offer (you cannot bid on your own listing), shows an admin moderation
   * controls, and shows a guest a sign-in prompt. So `expectedUiState` is
   * meaningless without this, and a case omitting it is really three untested
   * cases wearing one label.
   *
   * 🛑 A LIST, because the interesting content is usually the DIFFERENCE between
   * roles — "the owning seller must NOT see Make Offer where a buyer does" is one
   * case, not two, and splitting it loses the comparison that is the whole point.
   * Where roles differ, `expectedBehaviour` and `expectedUiState` say so in prose
   * ("Buyer: … Owning seller: …"). Deliberately NOT a parallel per-role structure:
   * that would be four more fields to keep in sync for something a sentence
   * expresses perfectly well.
   *
   * Also drives which session the automated harness browses with.
   */
  roles?: TesterCaseRole[];
  /** WHERE the tester begins. One unambiguous URL, unprefixed (/products, not /en/products). */
  startPage?: string;
  /**
   * WHAT the tester does. One action per entry, concrete fixtures named, literal
   * values ("Enter 780", not "enter an amount below the listed price") so two
   * runs are comparable and a regression can be spotted by diffing.
   *
   * 🛑 No assertions in here — they belong in the three expectation fields. A
   * step reading "click Save and confirm it worked" is two things wearing one
   * number, and the confirming half silently goes unchecked.
   *
   * Length varies with the case. "This page renders" is one honest step; a
   * multi-role negotiation is fifteen. There is no target, and padding toward one
   * produces the mechanical "Open X. Verify Y." shape that fills the field while
   * encoding nothing the label did not already say.
   */
  steps?: string[];
  /**
   * The exact data the tester enters or selects, as flat key/value pairs.
   *
   * 🛑 WHY THIS IS NOT JUST PROSE
   *
   * "Enter 780, the listed price is 999" reads fine and still lets two testers type
   * two different numbers, and gives an automated runner nothing to consume but a
   * sentence. The steps say WHAT TO DO; this says WITH WHAT — so the procedure is
   * repeatable by construction and a runner can fill a form from it directly.
   *
   * Flat and scalar on purpose: nested objects invite a shape nobody validates, and
   * every real value here is a string, number or boolean.
   *
   * Omitted entirely by a case that enters nothing — a read-only page has no inputs.
   */
  inputs?: Record<string, string | number | boolean>;
  /**
   * What the system must DO — the functional outcome, including side effects no
   * screen shows (a notification sent, stock decremented, an order created).
   *
   * Kept apart from `expectedUiState` because the gap between them is a real bug
   * class: the write succeeds and the screen never updates.
   */
  expectedBehaviour?: string;
  /**
   * What the tester must SEE — exact on-screen text and control states.
   *
   * Quote the screen ("the button reads 'Offer sent'"), never "the UI updates
   * correctly", which cannot be checked against a screenshot. This is what makes
   * the mandatory screenshot reviewable: the image is compared to a written
   * claim instead of to a guess about what "works" looked like.
   */
  expectedUiState?: string;
  /**
   * The values that must be CORRECT afterwards, as flat key/value pairs.
   *
   * `expectedUiState` settles what the screen looks like; this settles whether the
   * data behind it is right. The two are different questions, and a screen can be
   * entirely plausible over a wrong number — which is most of this codebase's bug
   * history, where a defect returns HTTP 200 with believable rows.
   *
   * Machine-readable so a runner asserts against it rather than re-reading English,
   * and so "it looked right" becomes a comparison.
   *
   * Omitted by a case with nothing checkable behind the screen.
   */
  expectedData?: Record<string, string | number | boolean>;
  /**
   * What is still true after a RELOAD — the persistence oracle.
   *
   * Several of the worst bugs here returned a normal 200, rendered
   * optimistically, and wrote nothing (the grouped-listing rename, the dropped
   * address landmark). Reloading is the only thing that catches them. Where a
   * case genuinely persists nothing, say so explicitly rather than leaving the
   * field to mean two different things.
   */
  endResult?: string;
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
  /** Normalized edge-n-gram search field. Replaced `searchTokens`. */
  searchTxt: string[];
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
  "searchTxt",
  "createdAt",
] as const;

export const DEFAULT_TESTER_CHECKLIST_ITEM_DATA: Partial<TesterChecklistItemDocument> = {
  order: 0,
  phase: 1,
  isActive: true,
  searchTxt: [],
  adminOnly: false,
};

export type TesterChecklistItemCreateInput = Omit<
  TesterChecklistItemDocument,
  "id" | "createdAt" | "updatedAt" | "searchTxt"
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

/**
 * Whose point of view a checklist case is written from.
 *
 * `guest` is a real role, not the absence of one — a signed-out visitor sees a
 * sign-in prompt where a buyer sees a wishlist heart, and that path had never
 * been exercised before this field existed.
 *
 * `seller` means the seller who OWNS the listing under test. A different
 * seller looking at someone else's listing is a `buyer` for that case — the
 * distinction matters because the owning seller is precisely who must NOT see
 * Make Offer.
 */
export const TESTER_CASE_ROLES = ["guest", "buyer", "seller", "admin", "employee"] as const;
export type TesterCaseRole = (typeof TESTER_CASE_ROLES)[number];

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
  SEARCH_TOKENS: "searchTxt",
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
