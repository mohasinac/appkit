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
  // search now), so the only remaining side-effect here is cache invalidation:
  // drop the ISR entries for this store's page and the stores listing. Reuses
  // the existing trigger, so it costs no additional invocations, and this
  // function performs no Firestore write.
  //
  // 🛑 The HANDLER above it does write one, as of the public search index:
  // `markSearchIndexDirty` flips a boolean on `searchIndex/manifest`. That is
  // still safe under Root Cause #92 — a different collection from the one the
  // trigger watches, with a boolean read-then-write guard — but the old
  // blanket claim that this trigger writes nothing is no longer true, and a
  // comment that is false is worse than no comment.
  await notifyRevalidate({ collection: "stores", id: input.storeId }, ctx);
}
