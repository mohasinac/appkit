/**
 * Tester sandbox visibility — the shared test store/products/categories/blog/event are
 * created as fully public/active documents so testers exercise the real browse/search/
 * checkout code paths, but must stay invisible to non-testers. Filtering happens at the
 * application layer (post-fetch, in-memory) rather than via a Firestore `where` clause,
 * because `isTestData` is a new optional field — a Firestore inequality filter on it
 * (a `!=` clause) would silently exclude every pre-existing document that doesn't have
 * the field set at all, which is worse than the problem it solves.
 */
import { isAdminUser, isTesterUser } from "../../../../features/auth/role-predicates";

export interface TestDataFlagged {
  isTestData?: boolean;
}

export interface ViewerLike {
  role?: string | null;
  /** @deprecated Legacy flag; read via isTesterUser during the migration window. */
  isTester?: boolean;
}

/** True when the viewer is allowed to see isTestData:true documents. */
export function canViewTestData(viewer: ViewerLike | null | undefined): boolean {
  return isTesterUser(viewer) || isAdminUser(viewer);
}

/** Strips isTestData:true items from a list unless the viewer is a tester or admin. */
export function filterTestDataForViewer<T extends TestDataFlagged>(
  items: T[],
  viewer: ViewerLike | null | undefined,
): T[] {
  if (canViewTestData(viewer)) return items;
  return items.filter((item) => item.isTestData !== true);
}

/** Returns null (as if not found) for an isTestData:true single doc when the viewer can't see it. */
export function filterSingleTestData<T extends TestDataFlagged>(
  item: T | null,
  viewer: ViewerLike | null | undefined,
): T | null {
  if (!item) return null;
  if (item.isTestData === true && !canViewTestData(viewer)) return null;
  return item;
}

/**
 * The PUBLIC projection of a list: sandbox rows removed, unconditionally.
 *
 * 🛑 Use this in any server read that feeds a public page. It is
 * `filterTestDataForViewer(items, undefined)` under a name that says what it is
 * for, because the two-argument form invites a call site to pass a viewer it
 * does not actually have — and `undefined` there reads like an oversight rather
 * than the fail-closed default it is.
 *
 * A signed-in tester still sees sandbox rows: the public pages hydrate from the
 * APIs, which DO thread the real viewer. This covers the server-rendered first
 * paint, which has no session in hand and must not publish the sandbox to
 * everyone on the strength of that.
 *
 * Added 2026-09-01 after a reseed made the leak visible: the homepage carried
 * 10 sandbox bundles, 8 events, 5 brands and 4 categories; /categories carried
 * 9; /stores rendered a card for `store-tester-sandbox`. Only the products path
 * had ever been filtered.
 */
export function hidePublicTestData<T extends TestDataFlagged>(items: T[]): T[] {
  return filterTestDataForViewer(items, undefined);
}

/** The single-document form of {@link hidePublicTestData}. */
export function hidePublicTestDoc<T extends TestDataFlagged>(item: T | null): T | null {
  return filterSingleTestData(item, undefined);
}
