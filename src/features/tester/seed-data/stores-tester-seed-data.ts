/*
 * WHY: Shared tester sandbox — one auto-approved test store testers browse/buy from and
 *      use as a reference when creating their own listings. Auto-expires after 7 days
 *      (testerSandboxCleanup) and is invisible to non-testers (application-layer filter).
 * WHAT: Exports 2 StoreDocument partials tagged isTestData:true — the shared sandbox
 *       (owned by admin) and the automated runner's OWN store.
 *
 * 🛑 TWO STORES, TWO OWNERS, AND THE SPLIT IS LOAD-BEARING.
 *
 * `store-tester-sandbox` stays owned by `user-admin-letitrip`. Several authored cases
 * name that owner explicitly — buying__bidding.ts:211 says "Sign in as admin@letitrip.in,
 * the owner of store-tester-sandbox", and :228 warns that signing in as anyone else
 * "gives a 403 that reads like a permissions bug and is not one". Repointing it would
 * turn those cases into false failures.
 *
 * `store-claude-tester` exists because `user-claude-tester` owned NO store while its user
 * document carried `storeId: "store-tester-qa-seller"` — a store whose `ownerId` is
 * `user-tester-qa`. The app resolves sellers by `ownerId`, so every /api/store/* call for
 * the runner returned 403 "No store found for this account" while the full Store Panel
 * rendered over it. That one-way pointer blocked 36 checklist cases (measured, run
 * 1789300124915). Root Cause #42's denormalised-mirror shape on the user<->store axis.
 *
 * It is deliberately EMPTY of listings. The seller cases it unblocks are create/CRUD
 * flows (listing-lifecycle, coupons, bundles, classifieds), which want a clean store;
 * cases that need pre-existing stock still use the shared sandbox.
 *
 * EXPORTS:
 *   storesTesterSeedData — Array of 2 Partial<StoreDocument> for the seed runner
 *
 * @tag domain:stores,tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed-cli.mjs
 * @tag sideEffects:none
 */

import type { StoreDocument } from "../../stores/schemas";
import { STORE_FIELDS } from "../../../constants/field-names";
import { seedPhoto } from "../../../seed/_helpers/media";
import { testDataExpiresAt } from "./tester-ttl";

export const storesTesterSeedData: Partial<StoreDocument>[] = [
  {
    id: "store-tester-sandbox",
    storeSlug: "store-tester-sandbox",
    ownerId: "user-admin-letitrip",
    storeName: "Tester Sandbox Store",
    storeDescription:
      "Shared test store for the tester QA program. Products here are disposable and auto-expire — buy, bid, and review freely.",
    storeCategory: "category-tester-sandbox",
    storeLogoURL: seedPhoto("store-logo-tester-sandbox-20260101", 400, 400),
    storeBannerURL: seedPhoto("store-banner-tester-sandbox-20260101", 1600, 400),
    status: STORE_FIELDS.STATUS_VALUES.ACTIVE,
    isPublic: true,
    bio: "This store exists only for tester QA. Everything in it is disposable test data.",
    returnPolicy: "N/A — test data.",
    shippingPolicy: "N/A — test data.",
    isTestData: true,
    testDataExpiresAt: testDataExpiresAt(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Partial<StoreDocument>,

  {
    id: "store-claude-tester",
    storeSlug: "store-claude-tester",
    ownerId: "user-claude-tester",
    storeName: "Claude Tester Store",
    storeDescription:
      "The automated checklist runner's own store. Exists so seller-side create/edit flows can be exercised against a store the runner actually owns. Disposable test data.",
    storeCategory: "category-tester-sandbox",
    storeLogoURL: seedPhoto("store-logo-claude-tester-20260101", 400, 400),
    storeBannerURL: seedPhoto("store-banner-claude-tester-20260101", 1600, 400),
    status: STORE_FIELDS.STATUS_VALUES.ACTIVE,
    isPublic: true,
    bio: "Automated tester's store. Everything in it is disposable test data.",
    returnPolicy: "N/A — test data.",
    shippingPolicy: "N/A — test data.",
    isTestData: true,
    testDataExpiresAt: testDataExpiresAt(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Partial<StoreDocument>,
];
