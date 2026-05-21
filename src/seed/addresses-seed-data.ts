/*
 * WHY: Seeds delivery addresses for users and pickup locations for stores in the YGO marketplace.
 * WHAT: Exports 8 addresses (5 user + 3 store) representing Domino City + Tokyo locations for Yugi/Kaiba/Admin. Top-level collection (SB-UNI-A 2026-05-13) with ownerType discriminator. PII encrypted via HMAC blind indices (emailIndex, phoneIndex). Composite indexes (ownerType, ownerId, createdAt desc) + (ownerType, ownerId, isDefault).
 *
 * EXPORTS:
 *   addressesSeedData — Array of 8 address documents with ownerType/ownerId discrimination
 *
 * @tag domain:addresses,shipping
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
 * @tag sideEffects:none
 */

import type { AddressDocument } from "../features/addresses/schemas/firestore";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const _rawAddressesSeedData: Partial<AddressDocument>[] = [
  // ────────────────────────────────────────────────────────────────────────────
  // User Addresses — Buyer delivery addresses
  // ────────────────────────────────────────────────────────────────────────────

  // Yugi Muto — Home
  {
    id: "addr-yugi-home",
    ownerType: "user",
    ownerId: "user-yugi-muto",
    label: "Home",
    fullName: "Yugi Muto",
    phone: "+91-99999-10001",
    addressLine1: "123 Duel City Lane",
    addressLine2: "Domino City",
    city: "Domino City",
    state: "Tokyo",
    postalCode: "110-0001",
    country: "Japan",
    isDefault: true,
    createdAt: daysAgo(180),
    updatedAt: daysAgo(1),
  },

  // Yugi Muto — Grandpa's Card Shop
  {
    id: "addr-yugi-shop",
    ownerType: "user",
    ownerId: "user-yugi-muto",
    label: "Grandpa's Card Shop",
    fullName: "Yugi Muto",
    phone: "+91-99999-10002",
    addressLine1: "45 Trading Card Plaza",
    addressLine2: "Domino City Center",
    city: "Domino City",
    state: "Tokyo",
    postalCode: "110-0002",
    country: "Japan",
    isDefault: false,
    createdAt: daysAgo(150),
    updatedAt: daysAgo(30),
  },

  // Seto Kaiba — Kaiba Mansion
  {
    id: "addr-kaiba-mansion",
    ownerType: "user",
    ownerId: "user-seto-kaiba",
    label: "Kaiba Mansion",
    fullName: "Seto Kaiba",
    phone: "+91-99999-20001",
    addressLine1: "1000 Kaiba Estate Drive",
    addressLine2: "Domino Heights",
    city: "Domino City",
    state: "Tokyo",
    postalCode: "110-0020",
    country: "Japan",
    isDefault: true,
    createdAt: daysAgo(200),
    updatedAt: daysAgo(10),
  },

  // Seto Kaiba — Kaiba Land Office
  {
    id: "addr-kaiba-land",
    ownerType: "user",
    ownerId: "user-seto-kaiba",
    label: "Kaiba Land",
    fullName: "Seto Kaiba",
    phone: "+91-99999-20002",
    addressLine1: "500 Kaiba Land Boulevard",
    addressLine2: "Tokyo Tower District",
    city: "Tokyo",
    state: "Tokyo",
    postalCode: "105-0001",
    country: "Japan",
    isDefault: false,
    createdAt: daysAgo(180),
    updatedAt: daysAgo(20),
  },

  // Admin (LetItRip) — HQ
  {
    id: "addr-letitrip-hq",
    ownerType: "user",
    ownerId: "user-admin-letitrip",
    label: "LetItRip HQ",
    fullName: "LetItRip Admin",
    phone: "+91-99999-30001",
    addressLine1: "100 Collectibles Plaza",
    addressLine2: "Mumbai Central",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400001",
    country: "India",
    isDefault: true,
    createdAt: daysAgo(365),
    updatedAt: daysAgo(5),
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Store Addresses — Pickup / fulfillment locations
  // ────────────────────────────────────────────────────────────────────────────

  // Kaiba Corp Card Vault — HQ (fulfillment)
  {
    id: "addr-kaiba-corp-hq",
    ownerType: "store",
    ownerId: "store-kaiba-corp-cards",
    label: "Kaiba Corp HQ",
    fullName: "Kaiba Corp Card Vault",
    phone: "+91-99999-40001",
    addressLine1: "2000 Kaiba Corp Tower",
    addressLine2: "Domino Business District",
    city: "Domino City",
    state: "Tokyo",
    postalCode: "110-0030",
    country: "Japan",
    isDefault: true,
    createdAt: daysAgo(360),
    updatedAt: daysAgo(2),
  },

  // Kaiba Corp Card Vault — Warehouse (backup fulfillment)
  {
    id: "addr-kaiba-corp-warehouse",
    ownerType: "store",
    ownerId: "store-kaiba-corp-cards",
    label: "Kaiba Land Warehouse",
    fullName: "Kaiba Land Fulfillment Center",
    phone: "+91-99999-40002",
    addressLine1: "300 Kaiba Land Logistics",
    addressLine2: "Tokyo Harbor Zone",
    city: "Tokyo",
    state: "Tokyo",
    postalCode: "135-0064",
    country: "Japan",
    isDefault: false,
    createdAt: daysAgo(300),
    updatedAt: daysAgo(15),
  },

  // LetItRip Official — Fulfillment
  {
    id: "addr-letitrip-fulfillment",
    ownerType: "store",
    ownerId: "store-letitrip-official",
    label: "LetItRip Fulfillment",
    fullName: "LetItRip Fulfillment Center",
    phone: "+91-99999-50001",
    addressLine1: "200 Logistics Lane",
    addressLine2: "Mumbai Warehouse District",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400086",
    country: "India",
    isDefault: true,
    createdAt: daysAgo(365),
    updatedAt: daysAgo(1),
  },
];

export const addressesSeedData = _rawAddressesSeedData as AddressDocument[];
