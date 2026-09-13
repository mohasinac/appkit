/*
 * WHY: Seeds a minimal set of buyer delivery addresses for the demo catalog. Store pickup
 *      addresses live entirely in store-addresses-seed-data.ts (merged in at the API route
 *      level) — this file only carries ownerType:"user" entries now, to avoid seeding two
 *      overlapping sources of store address data.
 * WHAT: Exports 4 user addresses. Top-level collection (SB-UNI-A) with ownerType discriminator.
 *       PII encrypted via HMAC blind indices (emailIndex, phoneIndex). Composite indexes
 *       (ownerType, ownerId, createdAt desc) + (ownerType, ownerId, isDefault).
 *
 * EXPORTS:
 *   addressesSeedData — Array of 4 user address documents
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

  /*
   * Automated checklist runner — delivery address.
   *
   * 🛑 THIS ROW IS WHY CHECKOUT CAN BE TESTED AT ALL.
   *
   * `user-claude-tester` had no address, so /checkout stopped dead at "Step 1 of 3:
   * Shipping Address — No saved addresses yet." Every order, payment, coupon-at-placement,
   * offer-checkout and forfeited-bid case died there: 117 blocked cases, 27% of everything
   * the run could not test, and the single largest blocker by a wide margin (measured,
   * run 1789300124915).
   *
   * It has to be SEEDED rather than created by the runner mid-run. `addresses` is PRESERVE
   * tier in tester/scripts/lib/collections.mjs — teardown deliberately never touches it,
   * because real people's saved addresses live there — so a row the runner created at
   * runtime would survive every future run with nothing owning its cleanup. Seeded, it is
   * idempotent: `appkit-seed load` upserts this exact id, and re-running changes nothing.
   */
  {
    id: "addr-claude-tester-home",
    ownerType: "user",
    ownerId: "user-claude-tester",
    label: "Home",
    fullName: "Claude (automated)",
    phone: "+91-99999-00019",
    addressLine1: "1 Automation Street",
    addressLine2: "Koramangala",
    city: "Bengaluru",
    state: "Karnataka",
    postalCode: "560034",
    country: "India",
    isDefault: true,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
];

export const addressesSeedData = _rawAddressesSeedData as AddressDocument[];
