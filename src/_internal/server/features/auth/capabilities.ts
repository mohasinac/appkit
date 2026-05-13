/**
 * Store capabilities server helper.
 *
 * Reads the capabilities[] array from the store document and merges with defaults.
 * Call this server-side only — never trust client-provided capability arrays.
 */

import { storeRepository } from "../../../../repositories";
import {
  DEFAULT_STORE_CAPABILITIES,
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
  const raw = (store as unknown as Record<string, unknown>).capabilities;
  if (Array.isArray(raw) && raw.length > 0) return raw as StoreCapability[];
  return [...DEFAULT_STORE_CAPABILITIES];
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
