/**
 * Core: stores/{id} onWrite — currently a no-op. Previous implementation
 * synced an external search index that has since been removed.
 */

import type { JobContext } from "../runtime/types";

export type StoreDoc = Record<string, unknown>;

export interface HandleStoreWriteInput {
  storeId: string;
  before: StoreDoc | null;
  after: StoreDoc | null;
}

export async function handleStoreWrite(
  _input: HandleStoreWriteInput,
  _ctx: JobContext,
): Promise<void> {
  // Intentionally empty — search provider removed; Firestore queries handle search now.
}
