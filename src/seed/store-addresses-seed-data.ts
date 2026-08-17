/*
 * WHY: Seeds store pickup/warehouse addresses for the minimal Beyblade-focused demo — 2 stores.
 * WHAT: 3 addresses: 2 LetItRip Official (HQ + warehouse), 1 Beyblade Arena (pickup point).
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

export const storeAddressesSeedData: StoreAddressSeedData[] = [
  // ── store-letitrip-official ───────────────────────────────────────────────
  {
    id: "saddr-letitrip-hq-001",
    storeSlug: "store-letitrip-official",
    label: "LetItRip HQ",
    fullName: "LetItRip Admin",
    phone: `${_phonePrefix}9876500000`,
    addressLine1: "12, Collector's Lane, Okhla Phase III",
    addressLine2: "Tech City Industrial Area",
    landmark: "Near Okhla Industrial Estate Gate 3",
    city: "Delhi",
    state: "Delhi",
    postalCode: "110020",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(400),
    updatedAt: daysAgo(1),
  },
  {
    id: "saddr-letitrip-warehouse-002",
    storeSlug: "store-letitrip-official",
    label: "Fulfilment Warehouse",
    fullName: "LetItRip Admin",
    phone: `${_phonePrefix}9876500000`,
    addressLine1: "Unit 7B, Connaught Logistics Park, Lajpat Nagar",
    city: "Delhi",
    state: "Delhi",
    postalCode: "110024",
    country: _locale.countryName,
    isDefault: false,
    createdAt: daysAgo(350),
    updatedAt: daysAgo(30),
  },

  // ── store-beyblade-arena ─────────────────────────────────────────────────
  {
    id: "saddr-beyblade-arena-main-001",
    storeSlug: "store-beyblade-arena",
    label: "Beyblade Arena Pickup Point",
    fullName: "Tyson Blader",
    phone: `${_phonePrefix}9876502001`,
    addressLine1: "Shop 9, T Nagar Collectibles Market, Pondy Bazaar",
    city: "Chennai",
    state: "Tamil Nadu",
    postalCode: "600017",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(150),
    updatedAt: daysAgo(4),
  },
];
