/**
 * Store capabilities server helper.
 *
 * Reads the capabilities[] array from the store document and merges with defaults.
 * Call this server-side only — never trust client-provided capability arrays.
 */

import { storeRepository } from "../../../../repositories";
import type { FirestoreDocument } from "@mohasinac/appkit";
import {
  DEFAULT_STORE_CAPABILITIES,
  resolveStoreCapabilities,
  type StoreCapability,
} from "../../../../features/auth/permissions/constants";

/**
 * Return the resolved capability set for a store.
 * Falls back to DEFAULT_STORE_CAPABILITIES when the store has no capabilities field.
 */
export async function getStoreCapabilities(
  storeId: string,
): Promise<StoreCapability[]> {
  if (!storeId) return [...DEFAULT_STORE_CAPABILITIES];
  const store = await storeRepository.findById(storeId);
  if (!store) return [...DEFAULT_STORE_CAPABILITIES];
  /*
   * The merge itself lives in `resolveStoreCapabilities` so a caller holding
   * the store document already can run the same rule without a second read.
   * This function is now just "fetch, then resolve".
   */
  return resolveStoreCapabilities(
    (store as unknown as FirestoreDocument).capabilities as
      | readonly string[]
      | undefined,
  );
}

/**
 * Check whether a store has a specific capability.
 * Convenience wrapper — prefer calling `getStoreCapabilities` once when checking multiple.
 */
export async function storeHasCapability(
  storeId: string,
  required: StoreCapability,
): Promise<boolean> {
  const caps = await getStoreCapabilities(storeId);
  return caps.includes(required);
}
