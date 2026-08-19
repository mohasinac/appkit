/**
 * Computes default `phase` numbers for the tester checklist catalog.
 *
 * `phase` is a real, stored, admin-editable field on `TesterChecklistItemDocument`
 * (see schemas/firestore.ts) — not something recomputed on every read. This
 * module only supplies the INITIAL assignment: given the catalog in its
 * existing groupKey/pageKey/order sequence, bucket whole pages together into
 * phases of roughly `targetPhaseSize` items each (never splitting a single
 * page's items across two phases), so a tester works through ~10-50 cases
 * per session instead of the full catalog at once.
 *
 * Used once at seed-authoring time (tester-checklist-seed-data.ts) and by
 * the one-off Firestore backfill for already-seeded items that predate the
 * `phase` field. After that, every read path (TesterHubView, admin results
 * views, the markdown report) just groups by the stored `item.phase` value —
 * no chunking logic at read time.
 */

export interface TesterPhaseAssignable {
  groupKey: string;
  pageKey: string;
}

/** Target item count per phase — real phase sizes vary a little around this
 * since a page's items are never split across two phases. */
export const DEFAULT_TESTER_PHASE_SIZE = 25;

/**
 * Returns a same-length array of 1-based phase numbers, one per input item,
 * computed by greedily packing whole pages (consecutive runs of the same
 * groupKey+pageKey) into phases of ~`targetPhaseSize` items. `items` MUST
 * already be in catalog order (e.g. sorted by the `order` field).
 */
export function assignDefaultPhases<T extends TesterPhaseAssignable>(
  itemsInCatalogOrder: T[],
  targetPhaseSize: number = DEFAULT_TESTER_PHASE_SIZE,
): number[] {
  const phaseNumbers: number[] = new Array(itemsInCatalogOrder.length);

  let currentPhase = 1;
  let currentPhaseCount = 0;
  let lastPageKey: string | null = null;

  for (let i = 0; i < itemsInCatalogOrder.length; i++) {
    const item = itemsInCatalogOrder[i]!;
    const pageId = `${item.groupKey}␟${item.pageKey}`;
    const isNewPage = pageId !== lastPageKey;

    // Only allow a phase boundary between pages, never mid-page.
    if (isNewPage && currentPhaseCount >= targetPhaseSize) {
      currentPhase += 1;
      currentPhaseCount = 0;
    }

    phaseNumbers[i] = currentPhase;
    currentPhaseCount += 1;
    lastPageKey = pageId;
  }

  return phaseNumbers;
}
