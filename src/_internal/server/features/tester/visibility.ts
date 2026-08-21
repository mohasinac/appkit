/**
 * Tester sandbox visibility — the shared test store/products/categories/blog/event are
 * created as fully public/active documents so testers exercise the real browse/search/
 * checkout code paths, but must stay invisible to non-testers. Filtering happens at the
 * application layer (post-fetch, in-memory) rather than via a Firestore `where` clause,
 * because `isTestData` is a new optional field — a Firestore inequality filter on it
 * (a `!=` clause) would silently exclude every pre-existing document that doesn't have
 * the field set at all, which is worse than the problem it solves.
 */
import { isAdminUser } from "../../../../features/auth/role-predicates";

export interface TestDataFlagged {
  isTestData?: boolean;
}

export interface ViewerLike {
  isTester?: boolean;
  role?: string | null;
}

/** True when the viewer is allowed to see isTestData:true documents. */
export function canViewTestData(viewer: ViewerLike | null | undefined): boolean {
  return Boolean(viewer?.isTester) || isAdminUser(viewer);
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
