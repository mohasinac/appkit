/**
 * Scams data layer — server-only fetchers with React.cache dedup. Scammer
 * profiles are public (verified only) so no auth gate at the data tier.
 */

import { cache } from "react";
import {
  listVerifiedScammers as _listVerified,
  getPublicScammerById as _getPublic,
  getScammerProfilePageData as _getProfilePageData,
} from "../../../../features/scams/actions/scam-actions";

export interface ScamsDataOptions {
  _reserved?: never;
}

export const listVerifiedScammers = cache(
  async (_opts?: ScamsDataOptions) => {
    void _opts;
    return _listVerified();
  },
);

export const getScammerForDetail = cache(
  async (id: string, _opts?: ScamsDataOptions) => {
    void _opts;
    if (!id) return null;
    return _getPublic(id);
  },
);

export const getScammerProfilePageData = cache(
  async (id: string, _opts?: ScamsDataOptions) => {
    void _opts;
    if (!id) return null;
    return _getProfilePageData(id);
  },
);
