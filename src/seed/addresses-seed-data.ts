/*
 * WHY: Seeds a minimal set of buyer delivery addresses for the demo catalog. Store pickup
 *      addresses live entirely in store-addresses-seed-data.ts (merged in at the API route
 *      level) — this file only carries ownerType:"user" entries now, to avoid seeding two
 *      overlapping sources of store address data.
 * WHAT: Exports 3 user addresses. Top-level collection (SB-UNI-A) with ownerType discriminator.
 *       PII encrypted via HMAC blind indices (emailIndex, phoneIndex). Composite indexes
 *       (ownerType, ownerId, createdAt desc) + (ownerType, ownerId, isDefault).
 *
 * EXPORTS:
 *   addressesSeedData — Array of 3 user address documents
 *
 * @tag domain:addresses,shipping
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts
 * @tag sideEffects:none
 */

import type { AddressDocument } from "../features/addresses/schemas/firestore";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const _rawAddressesSeedData: Partial<AddressDocument>[] = [
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
];

export const addressesSeedData = _rawAddressesSeedData as AddressDocument[];
