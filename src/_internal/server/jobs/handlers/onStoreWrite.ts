/**
 * Trigger handler: stores/{id} onWrite — currently a no-op. The previous
 * implementation synced an external search index that has since been removed.
 * The handler stays so the binding remains canonical and can be reactivated
 * without touching the consumer's functions/src/index.ts.
 */

import type { FirestoreTriggerHandler } from "../runtime/types";

type StoreDoc = Record<string, unknown>;

export const onStoreWriteHandler: FirestoreTriggerHandler<StoreDoc, StoreDoc> = async () => {
  // Intentionally empty — search provider removed; Firestore queries handle search now.
};
