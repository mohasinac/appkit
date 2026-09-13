/*
 * WHY: The shape an authoring session produces for one checklist case.
 * WHAT: `AuthoredCase` — the six-part contract, all fields required, plus an
 *       optional review flag. Per-page maps in this directory are written by hand
 *       and merged into the catalogue by `group()` in
 *       ../tester-checklist-seed-data.ts.
 *
 * 🛑 WHY AN OVERLAY RATHER THAN EDITING THE CATALOGUE IN PLACE
 *
 * The catalogue is one ~10k-line TypeScript literal holding 990 cases. Rewriting
 * it programmatically to insert six fields per case means brace-matching TS with
 * a regex, on the file that defines the project's primary coverage mechanism —
 * a bad merge silently corrupts cases nobody re-reads.
 *
 * An overlay keyed by full case id has one merge point, produces a per-page diff
 * (which is exactly the granularity the definition-of-done gate reviews at), and
 * cannot corrupt what it does not touch.
 *
 * It does NOT create the two-owners drift of Root Cause #42, because ownership is
 * split by FIELD and never duplicated: the catalogue owns `label`/`description`/
 * `href`, the overlay owns the six authored fields, and neither restates the
 * other's. The one failure it can have — an overlay entry whose case id no longer
 * exists — is detectable, and `audit-tester-plugin-wiring` fails on it.
 *
 * EXPORTS:
 *   AuthoredCase — the per-case authored payload
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed-data/tester-checklist-seed-data.ts
 * @tag sideEffects:none
 */

import type { TesterCaseRole } from "../../schemas";

export interface AuthoredCase {
  /**
   * WHICH ROLES this case affects. `seller` always means the OWNER of the listing
   * under test. A list, because the difference between roles is usually the point —
   * per-role detail goes in the expectation fields as prose.
   */
  roles: TesterCaseRole[];
  /** WHERE the tester starts. One unprefixed path. */
  startPage: string;
  /** WHAT they do. One action each, no assertions. As many as the case needs. */
  steps: string[];
  /** The exact values entered or selected. Omitted when the case enters nothing. */
  inputs?: Record<string, string | number | boolean>;
  /** What the system must DO, including side effects no screen shows. */
  expectedBehaviour: string;
  /** What must be SEEN. Quotes the screen, so a screenshot can settle it. */
  expectedUiState: string;
  /** The values that must be correct afterwards. Omitted when nothing is checkable. */
  expectedData?: Record<string, string | number | boolean>;
  /** What survives a RELOAD. States explicitly when nothing persists. */
  endResult: string;
  /**
   * The author wrote real steps but was unsure of the case's intent.
   *
   * Deliberately distinct from "has no steps": one is a case awaiting a second
   * opinion, the other is an unwritten case. Collapsing them would let the
   * second hide inside the first, which is the visible-gap-made-invisible
   * failure the whole contract exists to prevent.
   */
  needsReview?: boolean;
  reviewNote?: string;
  /**
   * The case needs a channel an automated browser does not have — a real email
   * inbox, or an interactive Google account. It is correct, it is worth keeping,
   * and an automated run can never do anything with it but abstain.
   *
   * 🛑 This is a PERMANENT FLOOR, not a backlog. Without the flag those ~13 cases
   * report `null` in every run forever and land in the same "blocked" bucket as a
   * case blocked by a real defect — so a raw blocked count mixes a constant with
   * a signal, and each run re-triages the same thirteen to rediscover that none
   * of them is a bug. Flagged, the report can subtract them and say so.
   *
   * Deliberately distinct from the other two reasons a case yields no verdict —
   * see the three-kinds-of-null table in docs/TESTING-RIG-NOTES.md. A missing
   * fixture is a RIG fault and must be fixed; a case blocked by another defect is
   * a PRODUCT fault and disappears when its cause does. Only this one is a
   * permanent property of running headlessly, and collapsing the three is how a
   * fixable gap hides inside an unfixable one.
   *
   * It must NEVER be used to excuse a case that is merely hard, flaky, or
   * currently failing: that converts a defect into a documented non-test.
   */
  requiresHumanChannel?: boolean;
  /** Which channel is missing, e.g. "real email inbox" / "interactive Google account". */
  humanChannelReason?: string;
}
