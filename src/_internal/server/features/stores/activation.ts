/*
 * WHY: Approving a store is the moment it becomes able to sell, and under split
 *      settlement it is therefore the moment its owner has to become a VENDOR
 *      of the collecting aggregator — otherwise the first multi-vendor cart
 *      containing their goods is refused, with the buyer told to come back
 *      later and nobody told why.
 *
 *      The hook is `storeRepository.setStatus`'s `ACTIVE` branch, and it is
 *      NOT in that method. A repository is the data layer and no repository
 *      here imports another feature's; `enqueueJob` pulls the jobs repository
 *      and the Admin Auth SDK with it, which is the Turbopack import-chain trap
 *      (Root Cause #6/#18). And a job enqueued from inside a write primitive
 *      would fire for a reseed, a backfill and a tester fixture, none of which
 *      is an approval.
 *
 * WHAT: The one named side effect of a store becoming active.
 *
 * 🛑 IT MUST `enqueueJob`, NEVER call the gateway inline. Vendor registration
 * is an outbound HTTPS call on a path an admin is waiting on, against Rule #6's
 * 10s sync-function ceiling — and the admin PATCH route has already done two
 * Firestore reads and up to three writes by the time it gets here.
 *
 * 🛑 BEST-EFFORT. A failed enqueue must never fail an approval that has already
 * published the store: the approval is the decision, registration is
 * bookkeeping that can be re-run. It is REPORTED rather than swallowed, so a
 * systematic failure shows up as a pattern (Root Cause #59), and the job is
 * idempotent — `vendorId` is the store slug, so a repeat is the same call.
 *
 * EXPORTS: STORE_VENDOR_REGISTER_JOB, onStoreActivated
 *
 * @tag domain:stores,payments
 * @tag layer:server
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:api/admin/stores/[uid]
 * @tag sideEffects:enqueues a job
 */

import { enqueueJob } from "../../../../features/jobs/actions/enqueue-job";
import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring";

/**
 * The `jobType` registered in `JOB_RUNNERS`.
 *
 * 🛑 A constant shared by the enqueue and the registry, because a `jobType` is
 * a STRING KEY matched by equality: a typo at either end produces a job
 * document that is written, picked up, matched against nothing, and marked
 * failed with "unknown job type" — which reads as a runner fault.
 */
export const STORE_VENDOR_REGISTER_JOB = "settlementVendorRegister" as const;

/**
 * Everything that must happen when a store becomes `active`.
 *
 * Today that is exactly one thing. It is a named function rather than two lines
 * in the route so a second activation side effect has somewhere to go that is
 * not "another block in the admin PATCH handler" — and so there is one place to
 * look when asking what approving a store does.
 */
export async function onStoreActivated(input: {
  storeSlug: string;
  /** The admin who approved it, for the job's `requestedBy`. */
  actorUid: string;
}): Promise<void> {
  if (!input.storeSlug) return;
  try {
    await enqueueJob({
      jobType: STORE_VENDOR_REGISTER_JOB,
      payload: { storeSlug: input.storeSlug },
      requestedBy: input.actorUid,
    });
  } catch (err) {
    const normalized = normalizeError(err);
    serverLogger.warn(
      "onStoreActivated: settlement-vendor registration could not be enqueued — " +
        "the store is approved; re-approve or re-run the job to register it",
      { storeSlug: input.storeSlug, error: normalized.message },
    );
  }
}
