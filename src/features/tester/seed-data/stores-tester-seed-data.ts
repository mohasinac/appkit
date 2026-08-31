/*
 * WHY: Shared tester sandbox — one auto-approved test store testers browse/buy from and
 *      use as a reference when creating their own listings. Auto-expires after 7 days
 *      (testerSandboxCleanup) and is invisible to non-testers (application-layer filter).
 * WHAT: Exports 1 StoreDocument partial tagged isTestData:true.
 *
 * EXPORTS:
 *   storesTesterSeedData — Array of 1 Partial<StoreDocument> for the seed runner
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
];
