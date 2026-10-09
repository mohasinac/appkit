/**
 * Core: stores/{id} onWrite — currently a no-op. Previous implementation
 * synced an external search index that has since been removed.
 */

import { notifyRevalidate } from "./revalidateNotify";
import type { JobContext } from "../runtime/types";
import type { JsonValue } from "@mohasinac/appkit";

export type StoreDoc = Record<string, JsonValue>;

export interface HandleStoreWriteInput {
  storeId: string;
  before: StoreDoc | null;
  after: StoreDoc | null;
}

export async function handleStoreWrite(
  input: HandleStoreWriteInput,
  ctx: JobContext,
): Promise<void> {
  // The search-index sync this used to perform is gone (Firestore queries handle
  // search now), so the only remaining side-effect is cache invalidation: drop
  // the ISR entries for this store's page and the stores listing. Reuses the
  // existing trigger, so this costs no additional invocations, and performs no
  // Firestore write (Root Cause #92).
  await notifyRevalidate({ collection: "stores", id: input.storeId }, ctx);
}
