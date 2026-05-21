/*
 * WHY: Seeds store pickup/warehouse addresses for YGO marketplace — 2 stores.
 * WHAT: 5 addresses: 2 LetItRip Official (HQ + warehouse), 3 Kaiba Corp (HQ + pickup + storage).
 *
 * EXPORTS:
 *   StoreAddressSeedData (interface)
 *   storeAddressesSeedData — Array for seed runner
 *
 * @tag domain:stores,addresses
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
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

  // ── store-kaiba-corp-cards ────────────────────────────────────────────────
  {
    id: "saddr-kaiba-corp-main-001",
    storeSlug: "store-kaiba-corp-cards",
    label: "Kaiba Corp Card Vault HQ",
    fullName: "Seto Kaiba",
    phone: `${_phonePrefix}9876501001`,
    addressLine1: "Flat 4B, Andheri Collectibles Centre, Link Road",
    addressLine2: "Andheri West",
    landmark: "Near Andheri Metro Station",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400053",
    country: _locale.countryName,
    isDefault: true,
    createdAt: daysAgo(380),
    updatedAt: daysAgo(5),
  },
  {
    id: "saddr-kaiba-corp-pickup-002",
    storeSlug: "store-kaiba-corp-cards",
    label: "Local Pickup Point",
    fullName: "Seto Kaiba",
    phone: `${_phonePrefix}9876501001`,
    addressLine1: "Shop 12, Juhu Card Market, Juhu Tara Road",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400049",
    country: _locale.countryName,
    isDefault: false,
    createdAt: daysAgo(300),
    updatedAt: daysAgo(10),
  },
  {
    id: "saddr-kaiba-corp-storage-003",
    storeSlug: "store-kaiba-corp-cards",
    label: "Climate-Controlled Storage",
    fullName: "Seto Kaiba",
    phone: `${_phonePrefix}9876501001`,
    addressLine1: "Unit 14, Noida Industrial Estate, Sector 63",
    city: "Noida",
    state: "Uttar Pradesh",
    postalCode: "201301",
    country: _locale.countryName,
    isDefault: false,
    createdAt: daysAgo(280),
    updatedAt: daysAgo(15),
  },
];
