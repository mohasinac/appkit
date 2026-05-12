/**
 * Account data layer — server-only fetchers with React.cache dedup so a
 * page + its generateMetadata share one Firestore read per request.
 */

import { cache } from "react";
import { userRepository, addressRepository } from "../../../../repositories";

export interface AccountDataOptions {
  /** Reserved for future overrides. */
  _reserved?: never;
}

/**
 * Fetch the full account profile for the given user UID. Returns `null` when
 * the user document is missing.
 */
export const getAccountForDetail = cache(
  async (uid: string, _opts?: AccountDataOptions) => {
    void _opts;
    if (!uid) return null;
    return userRepository.findById(uid);
  },
);

/**
 * Fetch the full address book for the given user UID. Empty array on no UID.
 */
export const listAddressesForUser = cache(
  async (uid: string, _opts?: AccountDataOptions) => {
    void _opts;
    if (!uid) return [];
    return addressRepository.findByUser(uid);
  },
);
