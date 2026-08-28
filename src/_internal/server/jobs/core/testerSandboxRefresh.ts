import type { JobContext } from "../runtime/types";
import { batchDelete, getTestDataRefs } from "../handlers/_helpers";
import { BID_FIELDS } from "../../../../constants/field-names";
import { encryptPiiFields } from "../../../../security/pii-encrypt";
import {
  BID_PII_FIELDS,
  OFFER_PII_FIELDS,
} from "../../../../security/pii-schemas";
import { SANDBOX_COLLECTIONS } from "./testerSandboxCleanup";
// Direct imports from each defining module (not the seed-data barrel) —
// this is internal appkit code, not part of the package's public API surface.
import { categoriesTesterSeedData } from "../../../../features/tester/seed-data/categories-tester-seed-data";
import { storesTesterSeedData } from "../../../../features/tester/seed-data/stores-tester-seed-data";
import { productsTesterSeedData } from "../../../../features/tester/seed-data/products-tester-seed-data";
import { blogTesterSeedData } from "../../../../features/tester/seed-data/blog-tester-seed-data";
import { eventsTesterSeedData } from "../../../../features/tester/seed-data/events-tester-seed-data";
import { offersTesterSeedData } from "../../../../features/tester/seed-data/offers-tester-seed-data";
import { bidsTesterSeedData } from "../../../../features/tester/seed-data/bids-tester-seed-data";

/**
 * PII per sandbox collection — the same map `seed-cli.mjs` applies.
 *
 * This job wrote every document with a bare `batch.set(...)`, while its own
 * comment claimed to mirror seed-cli's loadGeneric. loadGeneric ENCRYPTS;
 * this did not. So the 4-hourly refresh re-seeded sandbox PII in plaintext and
 * quietly undid the backfill for those fixtures — caught by reading the raw
 * documents after a deploy, where `bids` had 37 encrypted rows and one
 * plaintext one that had not existed at backfill time.
 *
 * A scheduled job writing straight to Firestore bypasses `applyWriteHooks`
 * exactly like the hand-rolled repository overrides did. Same defect, one
 * level up.
 */
const SANDBOX_PII: Partial<Record<string, readonly string[]>> = {
  offers: OFFER_PII_FIELDS,
  bids: BID_PII_FIELDS,
  products: ["sellerName", "sellerEmail"],
};

function encryptForSandbox<T extends object>(collection: string, data: T): T {
  const fields = SANDBOX_PII[collection];
  return fields ? (encryptPiiFields(data, [...fields]) as T) : data;
}

type SandboxCollection = (typeof SANDBOX_COLLECTIONS)[number];

const SEED_BY_COLLECTION: Record<SandboxCollection, Partial<{ id: string }>[]> = {
  categories: categoriesTesterSeedData,
  stores: storesTesterSeedData,
  products: productsTesterSeedData,
  blogPosts: blogTesterSeedData,
  events: eventsTesterSeedData,
  offers: offersTesterSeedData,
};

const BID_CHUNK_SIZE = 30; // Firestore `in` query cap

/**
 * Reverts every live tester-sandbox fixture back to its canonical seeded
 * shape (undoing edits made through admin/seller forms) and prunes any
 * isTestData doc that isn't one of the known fixtures (something a tester
 * created during QA, e.g. a cloned product). Runs every 4 hours — distinct
 * from `runTesterSandboxCleanup`, which only deletes docs whose 7-day
 * `testDataExpiresAt` TTL has actually lapsed and never touches still-live
 * docs' fields. Scoped to the tester sandbox only (`isTestData: true`) —
 * the permanent Beyblade catalog real visitors browse is never touched.
 */
export async function runTesterSandboxRefresh(ctx: JobContext): Promise<void> {
  let reverted = 0;
  let deletedExtras = 0;

  for (const collection of SANDBOX_COLLECTIONS) {
    const seedDocs = SEED_BY_COLLECTION[collection] ?? [];
    const validIds = new Set(seedDocs.map((d) => d.id).filter((id): id is string => Boolean(id)));

    if (seedDocs.length > 0) {
      const batch = ctx.db.batch();
      for (const doc of seedDocs) {
        const { id, ...data } = doc;
        if (!id) continue;
        // merge:true mirrors seed-cli.mjs's loadGeneric — the seed payload
        // carries every canonical field, so this fully overwrites anything
        // a tester edited through the UI.
        batch.set(ctx.db.collection(collection).doc(id), encryptForSandbox(collection, data), { merge: true });
        reverted++;
      }
      await batch.commit();
    }

    const testDataRefs = await getTestDataRefs(ctx.db, collection, null);
    const extraRefs = testDataRefs.filter((ref) => !validIds.has(ref.id));
    deletedExtras += await batchDelete(ctx, extraRefs);
  }

  // Bids aren't isTestData-flagged themselves — scoped by productId
  // referencing a sandbox product instead, mirroring runTesterSandboxCleanup's
  // cascade convention.
  const sandboxProductIds = (SEED_BY_COLLECTION.products ?? [])
    .map((d) => d.id)
    .filter((id): id is string => Boolean(id));
  const validBidIds = new Set(bidsTesterSeedData.map((d) => d.id).filter((id): id is string => Boolean(id)));

  if (bidsTesterSeedData.length > 0) {
    const bidBatch = ctx.db.batch();
    for (const bid of bidsTesterSeedData) {
      const { id, ...data } = bid;
      if (!id) continue;
      bidBatch.set(ctx.db.collection("bids").doc(id), encryptForSandbox("bids", data), { merge: true });
      reverted++;
    }
    await bidBatch.commit();
  }

  const extraBidRefs: FirebaseFirestore.DocumentReference[] = [];
  for (let i = 0; i < sandboxProductIds.length; i += BID_CHUNK_SIZE) {
    const chunk = sandboxProductIds.slice(i, i + BID_CHUNK_SIZE);
    if (chunk.length === 0) continue;
    const snap = await ctx.db.collection("bids").where(BID_FIELDS.PRODUCT_ID, "in", chunk).get();
    for (const doc of snap.docs) {
      if (!validBidIds.has(doc.id)) extraBidRefs.push(doc.ref);
    }
  }
  deletedExtras += await batchDelete(ctx, extraBidRefs);

  ctx.logger.info("Tester sandbox refresh complete", { reverted, deletedExtras });
}
