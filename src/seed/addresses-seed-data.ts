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
  // Mock User 3 — Home
  {
    id: "addr-yugi-home",
    ownerType: "user",
    ownerId: "user-yugi-muto",
    label: "Home",
    fullName: "Mock User 3",
    phone: "+91-99999-10001",
    addressLine1: "123 Stadium Lane",
    addressLine2: "Vijay Nagar",
    city: "Indore",
    state: "Madhya Pradesh",
    postalCode: "452010",
    country: "India",
    isDefault: true,
    createdAt: daysAgo(180),
    updatedAt: daysAgo(1),
  },

  // Mock User 2 — Home
  {
    id: "addr-kaiba-mansion",
    ownerType: "user",
    ownerId: "user-seto-kaiba",
    label: "Home",
    fullName: "Mock User 2",
    phone: "+91-99999-20001",
    addressLine1: "1000 Civil Lines Drive",
    addressLine2: "Sitabuldi",
    city: "Nagpur",
    state: "Maharashtra",
    postalCode: "440012",
    country: "India",
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
    fullName: "Mock User 1",
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
