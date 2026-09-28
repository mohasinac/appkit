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
 * Groups that take the earliest phases, ahead of the round-robin.
 *
 * 🛑 THE ROUND-ROBIN BELOW IS RIGHT FOR EVERYTHING ELSE AND WRONG FOR THIS.
 * Interleaving exists so an early stop costs a proportional slice of every
 * group rather than the whole tail — a fair outcome when no group matters more
 * than another. But `happy-path` is not one group among fourteen: it is the
 * question "can anyone buy anything on this site", and a run that covered 7% of
 * it alongside 7% of SEO metadata has answered nothing.
 *
 * So these groups are packed FIRST, in their own catalogue order, and the
 * round-robin then runs over the remainder exactly as before.
 *
 * Adding a group here is a real cost: every group after it loses its early
 * proportional slice. Two entries is the intended size of this list.
 */
export const PRIORITY_GROUPS: readonly string[] = ["happy-path"];

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
  /*
   * 🛑 PAGES ARE INTERLEAVED ACROSS GROUPS, NOT PACKED IN CATALOGUE ORDER.
   *
   * This used to walk the catalogue straight through, so a group's phase number
   * was an accident of where its `...group(...)` spread sat in a 6,200-line
   * literal. `admin` is the 9th spread, so its 231 cases landed at phases
   * **25–32** — and any run that stops early is therefore GUARANTEED to lose
   * the largest, most privileged group in its entirety. The same held for every
   * infrastructure group in the tail: page-wiring (32–33), cta-layout (33),
   * addresses and search-and-nav (34).
   *
   * That is not hypothetical. Run run-1789300124915 stopped at phase 17 of 34
   * and ten of fourteen groups had ZERO coverage — 527 cases, including all 233
   * admin ones — while the run looked about half done.
   *
   * Round-robin over groups fixes the shape rather than the symptom: an early
   * stop now costs a proportional slice of every group instead of the whole
   * tail. Groups are visited largest-first within each round so the big ones do
   * not bunch up at the end as the small ones run out.
   *
   * A phase may now span several groups. That is fine for a tester session —
   * it is ~25 cases either way — and every read path already groups by the
   * STORED `item.phase`, never by position.
   *
   * 🛑 The RETURN IS STILL POSITIONAL. Items keep their catalogue order and
   * their `order` field; only the phase LABEL changes. Nothing downstream
   * reorders, and `fetch-cases` still sorts by (phase, order) to build batches.
   */
  const pageOrder: string[] = [];
  const pageSize = new Map<string, number>();
  const pageGroup = new Map<string, string>();
  for (const item of itemsInCatalogOrder) {
    const pageId = `${item.groupKey}␟${item.pageKey}`;
    if (!pageSize.has(pageId)) {
      pageOrder.push(pageId);
      pageSize.set(pageId, 0);
      pageGroup.set(pageId, item.groupKey);
    }
    pageSize.set(pageId, pageSize.get(pageId)! + 1);
  }

  // Queues of pages per group, each still in catalogue order within its group.
  const byGroup = new Map<string, string[]>();
  for (const pageId of pageOrder) {
    const g = pageGroup.get(pageId)!;
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(pageId);
  }

  /*
   * Priority groups first, whole, in catalogue order — then the round-robin over
   * everything else. See PRIORITY_GROUPS for why this one group is exempt from
   * the interleaving the rest depends on.
   */
  const interleaved: string[] = [];
  for (const g of PRIORITY_GROUPS) {
    for (const pageId of byGroup.get(g) ?? []) interleaved.push(pageId);
  }

  const groupsLargestFirst = [...byGroup.entries()]
    .filter(([g]) => !PRIORITY_GROUPS.includes(g))
    .map(([g, pages]) => ({
      g,
      pages,
      cases: pages.reduce((n, p) => n + pageSize.get(p)!, 0),
    }))
    .sort((a, b) => b.cases - a.cases || a.g.localeCompare(b.g))
    .map((e) => e.g);

  const cursor = new Map<string, number>(groupsLargestFirst.map((g) => [g, 0]));
  let remaining = pageOrder.length - interleaved.length;
  while (remaining > 0) {
    for (const g of groupsLargestFirst) {
      const i = cursor.get(g)!;
      const pages = byGroup.get(g)!;
      if (i >= pages.length) continue;
      interleaved.push(pages[i]!);
      cursor.set(g, i + 1);
      remaining--;
    }
  }

  // Pack the interleaved page sequence into phases, never splitting a page.
  const phaseOfPage = new Map<string, number>();
  let currentPhase = 1;
  let currentPhaseCount = 0;
  for (const pageId of interleaved) {
    const size = pageSize.get(pageId)!;
    if (currentPhaseCount > 0 && currentPhaseCount >= targetPhaseSize) {
      currentPhase += 1;
      currentPhaseCount = 0;
    }
    phaseOfPage.set(pageId, currentPhase);
    currentPhaseCount += size;
  }

  return itemsInCatalogOrder.map(
    (item) => phaseOfPage.get(`${item.groupKey}␟${item.pageKey}`)!,
  );
}
