/*
 * WHY: Support-ticket fixtures. Production has none, so this is empty.
 * WHAT: Empty. The export and its mapping pipeline are kept.
 *
 * 🛑 PRUNED TO MATCH LIVE, 2026-10-21. This file previously seeded demo
 * fixtures that production does not have. `appkit-seed load` has NO
 * production guard and `.env.local` points at the live project, so every one
 * of those rows was one command away from appearing on the live site.
 *
 * Consequence, recorded rather than left to be discovered: tester cases that
 * acted on this data can now only report "could not test". That cost was
 * raised with the owner before the deletion and accepted.
 *
 * EXPORTS:
 *   supportTicketsSeedData — Array of Partial<SupportTicketPlain> for seed runner
 *
 * @tag domain:support
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

/*
 * 🛑 `SupportTicketPlain`: these fixtures hold REAL plaintext and `seed-cli`
 * encrypts the PII fields on write through the same `SUPPORT_TICKET_PII_FIELDS`
 * map the repository uses. The document type now declares those fields
 * `Encrypted<string>`, so typing this array as the document would assert that
 * these literals are ciphertext.
 */
import type { SupportTicketPlain, TicketMessage } from "../features/support/schemas/firestore";
import { buildSearchTxt } from "../utils/search-txt";
import type { FieldChange, StatusChangeEntry } from "../_internal/shared/history/types";

function msg(
  id: string,
  authorId: string,
  authorRole: TicketMessage["authorRole"],
  body: string,
  daysAgo: number,
): TicketMessage {
  const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return { id, authorId, authorRole, body, createdAt };
}

const BASE = Date.now();
function daysBack(n: number) {
  return new Date(BASE - n * 24 * 60 * 60 * 1000);
}

/**
 * A timeline entry for the W18 `statusHistory` fixtures.
 *
 * `actorUid` only, never a name — `withHistory` scrubs
 * SUPPORT_TICKET_PII_FIELDS (which includes `assignedToName`) from real
 * writes, so a fixture carrying one would be the single place that is untrue.
 */
function entry(
  at: Date,
  actorRole: "system" | "admin" | "buyer",
  trigger: string,
  changes: Record<string, FieldChange>,
  extra?: { reason?: string; note?: string; actorUid?: string },
): StatusChangeEntry {
  return { at, actorRole, trigger, changes, ...extra };
}

const supportTicketRecords: Partial<SupportTicketPlain>[] = [];

/**
 * Derive `searchTxt` for every record from its own subject.
 *
 * The seed writes documents raw via `batch.set()` — both `seed/runner.ts` and
 * `seed-cli.mjs` — bypassing the repository, which is the only thing that
 * builds tokens. Without this every seeded ticket would have no `searchTxt` at
 * all and `array-contains` would match zero documents, for every query,
 * forever. That is exactly how FAQ search was found broken.
 *
 * Computed with the SAME `buildSearchTxt` over the SAME field the repository
 * uses, so a seeded ticket and a user-created one are byte-identical. Pure
 * function of the record's own content, so it stays deterministic and does not
 * reintroduce the `appkit-seed` idempotency problem of Root Cause #25.
 */
export const supportTicketsSeedData: Partial<SupportTicketPlain>[] =
  supportTicketRecords.map((ticket) => ({
    ...ticket,
    searchTxt: ticket.subject ? buildSearchTxt([ticket.subject]) : [],
  }));
