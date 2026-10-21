/*
 * WHY: Store pickup/warehouse addresses. Production has none, so this is empty.
 * WHAT: Empty. The export is kept so the loader's import resolves.
 *
 * 🛑 PRUNED TO MATCH LIVE, 2026-10-21. This file previously seeded demo
 * fixtures that production does not have. `appkit-seed load` has NO
 * production guard and `.env.local` points at the live project, so every one
 * of those rows was one command away from appearing on the live site.
 *
 * Consequence, recorded rather than left to be discovered: tester cases that
 * acted on this data can now only report "could not test". That cost was
 * raised with the owner before the deletion and accepted.
 *
 * EXPORTS:
 *   StoreAddressSeedData (interface)
 *   storeAddressesSeedData — Array for seed runner
 *
 * @tag domain:stores,addresses
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import { getSeedLocale, getDefaultPhonePrefix } from "./seed-market-config";

const _locale = getSeedLocale();
const _phonePrefix = getDefaultPhonePrefix();

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export interface StoreAddressSeedData {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  storeSlug: string;
}

export const storeAddressesSeedData: StoreAddressSeedData[] = [];
