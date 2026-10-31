/**
 * settlementVendorRegister — register one store as a split-settlement vendor.
 *
 * ## Why this is a job and not an inline call
 *
 * The trigger is a store being approved (`onStoreActivated`, off the `ACTIVE`
 * branch of `storeRepository.setStatus`, dispatched by the admin PATCH route).
 * Registration is an outbound HTTPS call on a path an admin is waiting on,
 * against Rule #6's 10s sync-function ceiling, in a request that has already
 * made two Firestore reads and up to three writes. CLAUDE.md § Async Job
 * Primitive: a route enqueues, this runs in a Firebase Function.
 *
 * ## Why registration has to happen at all
 *
 * A marketplace cannot be a payment aggregator and cannot commingle buyer funds
 * with its own, so a seller's share must be settled buyer → aggregator escrow →
 * seller, with the platform never holding it. For the aggregator to pay a seller
 * it must know them as a VENDOR. A store with no vendor registration therefore
 * cannot be part of a multi-vendor online cart at all — the capture is refused
 * rather than collected into the platform's account.
 *
 * ## 🛑 IT RECORDS WHY IT COULD NOT REGISTER. IT NEVER FAILS SILENTLY.
 *
 * Blocker #4: payout details live on the OWNER'S USER DOCUMENT while approval
 * reads the STORE, so this job can and routinely will fire for a store with
 * nothing to register. That is the normal case for a brand-new seller, not an
 * error — and it is the case that must be legible, because the seller's own
 * next action (fill in the payout form) is what clears it.
 *
 * So every exit writes a `settlementVendors.<gateway>` record with a stated
 * reason, and the job reports `skipped` rather than `failed` for anything the
 * SELLER can fix. `blocked` is distinguished from `rejected` for exactly that
 * reason — see `SettlementVendorStatusValues`.
 *
 * ## 🛑 Idempotent, because it WILL run again
 *
 * Jobs retry, and an admin can re-approve a store. `vendorId` is always the
 * store slug, so a repeat call names the same vendor; the adapter's own
 * `registerSettlementVendor` is documented idempotent by contract.
 */

import type { JobContext } from "../runtime/types";
import type { JobRunResult } from "./jobRunners";
import { storeRepository } from "../../../../features/stores/repository/store.repository";
import { userRepository } from "../../../../features/auth/repository/user.repository";
import {
  SettlementVendorStatusValues,
  StoreStatusValues,
  type SettlementVendorStatus,
  type StoreSettlementVendor,
} from "../../../../features/stores/schemas/firestore";
import type {
  SettlementVendorInput,
  SettlementVendorOutcome,
  SettlementVendorResult,
} from "../../../../contracts/payment";
import {
  PAYOUT_VERIFICATION,
  payoutDestinationIssues,
  isValidPan,
  type PayoutVerificationStatus,
} from "../../../shared/features/payouts/destination";
import { paymentGatewayCandidates } from "../../features/checkout/gateway-selection";
import { normalizeError } from "../../../../errors/normalize";

export interface SettlementVendorRegisterPayload {
  /** The store's slug, which is also its document id and its `vendorId`. */
  storeSlug: string;
}

/** `outcome` → the stored status. A straight mapping, named so it cannot drift. */
const STATUS_BY_OUTCOME: Record<SettlementVendorOutcome, SettlementVendorStatus> = {
  active: SettlementVendorStatusValues.ACTIVE,
  pending: SettlementVendorStatusValues.PENDING,
  rejected: SettlementVendorStatusValues.REJECTED,
};

/**
 * `outcome` → what the SELLER's payout destination verification becomes.
 *
 * 🛑 This is the only place `verified` is ever written, and it is written from
 * a gateway's answer and nothing else. `verify_account: true` on the Cashfree
 * vendor payload asks the aggregator to run its own account verification, which
 * is the one check in this system that is not a self-assertion — we hold no
 * banking licence and have no penny-drop.
 *
 * 🛑 `pending` maps to `pending`, NOT to `verified`. An aggregator that has
 * taken the vendor and is still checking has not said the account is good.
 */
const VERIFICATION_BY_OUTCOME: Record<SettlementVendorOutcome, PayoutVerificationStatus> = {
  active: PAYOUT_VERIFICATION.VERIFIED,
  pending: PAYOUT_VERIFICATION.PENDING,
  rejected: PAYOUT_VERIFICATION.FAILED,
};

/** One `skipped`/`failed` exit, recorded on the store and reported to the caller. */
async function recordAndSkip(input: {
  storeSlug: string;
  gateway: string;
  status: SettlementVendorStatus;
  reason: string;
  priorAttempts: number;
  ctx: JobContext;
}): Promise<JobRunResult> {
  const { storeSlug, gateway, status, reason, priorAttempts, ctx } = input;
  const record: StoreSettlementVendor = {
    // 🛑 Still OUR id even on a blocked record: it is what a later successful
    // run will register, and an empty string here would make the split builder
    // read "registered with no id" rather than "not registered".
    vendorId: storeSlug,
    status,
    message: reason,
    lastAttemptAt: ctx.now,
    attempts: priorAttempts + 1,
  };
  try {
    await storeRepository.setSettlementVendor(storeSlug, gateway, record);
  } catch (err) {
    const normalized = normalizeError(err);
    ctx.logger.error(
      "settlementVendorRegister: could not record the registration outcome",
      err,
      { storeSlug, gateway, error: normalized.message },
    );
  }
  ctx.logger.info("settlementVendorRegister: not registered", {
    storeSlug,
    gateway,
    status,
    reason,
  });
  return {
    summary: { total: 1, succeeded: 0, skipped: 1, failed: 0 },
    succeeded: [],
    skipped: [storeSlug],
    failed: [],
    data: { storeSlug, gateway, status, reason },
  };
}

export async function runSettlementVendorRegister(
  payload: SettlementVendorRegisterPayload,
  ctx: JobContext,
): Promise<JobRunResult> {
  const storeSlug = payload.storeSlug?.trim();
  if (!storeSlug) {
    return {
      summary: { total: 0, succeeded: 0, skipped: 0, failed: 1 },
      succeeded: [],
      skipped: [],
      failed: [{ id: "(none)", reason: "settlementVendorRegister requires a storeSlug" }],
    };
  }

  /*
   * 🛑 Which gateway? THE SPLIT-CAPABLE ONE, selected on the CAPABILITY and
   * never on the name "cashfree" (Root Cause #61 — and see
   * `SettlementGatewayCandidate`'s own 🛑). `paymentGatewayCandidates` carries
   * the registry's `supportsSplit`, which is a fact about the product the
   * business onboarded rather than about the adapter.
   *
   * 🛑 NO splitting gateway enabled is NOT a failure. It is a configuration
   * state — most installs have none — and a job that marked every approval
   * failed for it would fill the queue with noise. Nothing is recorded on the
   * store either: there is no gateway to key the record under.
   */
  const splitCapable = paymentGatewayCandidates().filter(
    (entry) => entry.candidate.supportsSplit === true,
  );
  if (splitCapable.length === 0) {
    ctx.logger.info(
      "settlementVendorRegister: no split-capable gateway is enabled — nothing to register",
      { storeSlug },
    );
    return {
      summary: { total: 1, succeeded: 0, skipped: 1, failed: 0 },
      succeeded: [],
      skipped: [storeSlug],
      failed: [],
      data: { storeSlug, reason: "no split-capable gateway enabled" },
    };
  }
  /*
   * Lowest `order` wins, matching the per-cart resolver's own tie-break. With
   * one splitting gateway live today this is always that one; registering a
   * store with EVERY splitting gateway is a deliberate later decision (it
   * multiplies the outbound calls and the refusal surface), which is why the
   * stored record is keyed per gateway and this loop is not.
   */
  const [{ provider, candidate }] = [...splitCapable].sort(
    (a, b) =>
      (a.candidate.order ?? Number.MAX_SAFE_INTEGER) -
      (b.candidate.order ?? Number.MAX_SAFE_INTEGER),
  );
  const gateway = candidate.name;

  const store = await storeRepository.findById(storeSlug);
  if (!store) {
    return {
      summary: { total: 1, succeeded: 0, skipped: 0, failed: 1 },
      succeeded: [],
      skipped: [],
      failed: [{ id: storeSlug, reason: "store not found" }],
    };
  }

  const prior = store.settlementVendors?.[gateway];
  const priorAttempts = prior?.attempts ?? 0;

  /*
   * 🛑 Already `active` → do nothing, and this is the idempotency that matters
   * most. Re-approving a store, or a job retry, must not send a second
   * registration: whether the aggregator treats that as an update or a conflict
   * is unconfirmed (see `registerSettlementVendor`'s 🛑), and the one thing we
   * can control is not asking twice when we already have the answer.
   */
  if (prior?.status === SettlementVendorStatusValues.ACTIVE && prior.vendorId) {
    ctx.logger.info("settlementVendorRegister: already registered", { storeSlug, gateway });
    return {
      summary: { total: 1, succeeded: 1, skipped: 0, failed: 0 },
      succeeded: [storeSlug],
      skipped: [],
      failed: [],
      data: { storeSlug, gateway, vendorId: prior.vendorId, status: prior.status },
    };
  }

  // A store that is not active cannot sell, so it has nothing to be settled.
  if (store.status !== StoreStatusValues.ACTIVE) {
    return recordAndSkip({
      storeSlug,
      gateway,
      status: SettlementVendorStatusValues.BLOCKED,
      reason: `the store is "${store.status}", not active`,
      priorAttempts,
      ctx,
    });
  }

  /*
   * ── Blocker #4: the payout destination lives on the OWNER'S USER DOCUMENT ──
   *
   * 🛑 `revealUser`, never the raw document. `UserRepository` is
   * ciphertext-by-default and `payoutDetails` is decrypted by
   * `decryptPayoutDetails` — a DIFFERENT scheme from `PAYOUT_PII_FIELDS`, which
   * covers a payout document's own `upiId`/`sellerEmail`. Reading the raw
   * fields would hand the aggregator `enc:v1:…` as an account number, which it
   * would accept as a string and then fail to settle to, months later.
   */
  const owner = store.ownerId ? await userRepository.findById(store.ownerId) : null;
  if (!owner) {
    return recordAndSkip({
      storeSlug,
      gateway,
      status: SettlementVendorStatusValues.BLOCKED,
      reason: "the store has no owner account to register",
      priorAttempts,
      ctx,
    });
  }
  const ownerPlain = userRepository.revealUser(owner);
  const details = ownerPlain.payoutDetails;

  const destinationIssues = payoutDestinationIssues(details);
  if (destinationIssues.length > 0) {
    return recordAndSkip({
      storeSlug,
      gateway,
      status: SettlementVendorStatusValues.BLOCKED,
      reason:
        `the seller's payout details are incomplete — ` +
        destinationIssues.map((i) => i.message).join(" "),
      priorAttempts,
      ctx,
    });
  }

  /*
   * ── Blocker #1: the PAN ──────────────────────────────────────────────────
   *
   * 🛑 Required HERE and nowhere else, and it is a soft requirement by design.
   * Most aggregator entity types need a PAN, but which ones is the aggregator's
   * rule and not ours — so this job refuses only on a MALFORMED one (which the
   * gateway would reject anyway, for a reason nobody could read) and sends an
   * absent one through as absent, letting the gateway make its own decision.
   * Guessing on its behalf is how blocker #5 (an unregistered seller may be
   * un-onboardable) turns into "we decided they cannot sell".
   */
  const pan = storeRepository.revealPan(store);
  if (pan && !isValidPan(pan)) {
    return recordAndSkip({
      storeSlug,
      gateway,
      status: SettlementVendorStatusValues.BLOCKED,
      reason:
        "the PAN on file is not a valid PAN (five letters, four digits, one letter)",
      priorAttempts,
      ctx,
    });
  }

  const email = ownerPlain.email?.trim();
  const phone = ownerPlain.phoneNumber?.trim();
  if (!email || !phone) {
    return recordAndSkip({
      storeSlug,
      gateway,
      status: SettlementVendorStatusValues.BLOCKED,
      reason:
        `the seller's account needs ${!email ? "an email address" : ""}` +
        `${!email && !phone ? " and " : ""}${!phone ? "a phone number" : ""} ` +
        `before a payment provider can register them`,
      priorAttempts,
      ctx,
    });
  }

  /*
   * 🛑 EXACTLY ONE destination, chosen by the seller's own `method`. Sending
   * both would let the aggregator pick where real money lands.
   *
   * 🛑 Read into locals and NARROWED rather than cast. `payoutDestinationIssues`
   * above has already proved the chosen destination is complete, so a cast
   * would "work" — and `details.upiId as string` is specifically the
   * brand-defeating shape `audit-pii-read-sites` R3 exists to refuse, because a
   * cast on a PII field is the one way to reopen the hole the nominal brand
   * closed. A guard costs one branch and asserts nothing.
   */
  const accountHolderName = store.legalName?.trim() || store.storeName;
  const upiVpa = details?.method === "upi" ? details.upiId?.trim() : undefined;
  const bank = details?.method === "bank_transfer" ? details.bankAccount : undefined;
  const destination: Pick<SettlementVendorInput, "bank" | "upi"> | null = upiVpa
    ? { upi: { vpa: upiVpa, accountHolderName } }
    : bank?.accountNumber && bank.ifscCode && bank.accountHolderName
      ? {
          bank: {
            accountNumber: bank.accountNumber,
            ifsc: bank.ifscCode.toUpperCase(),
            accountHolderName: bank.accountHolderName,
          },
        }
      : null;
  if (!destination) {
    /*
     * Unreachable given the issue check above, and it is here anyway because
     * the alternative is a cast. An unreachable branch that records a reason is
     * cheaper than a cast that would silently hand the aggregator `undefined`
     * if the two checks ever disagree.
     */
    return recordAndSkip({
      storeSlug,
      gateway,
      status: SettlementVendorStatusValues.BLOCKED,
      reason: "the seller's payout destination could not be resolved",
      priorAttempts,
      ctx,
    });
  }

  const vendorInput: SettlementVendorInput = {
    vendorId: storeSlug,
    name: accountHolderName,
    email,
    phone,
    ...(pan ? { pan } : {}),
    ...(store.gstin?.trim() ? { gstin: store.gstin.trim() } : {}),
    ...destination,
  };

  let result: SettlementVendorResult | null = null;
  let callFailure: string | null = null;
  try {
    result = await provider.registerSettlementVendor(vendorInput);
  } catch (err) {
    /*
     * The adapter converts a gateway refusal into `outcome: "rejected"`, so a
     * THROW here is our own problem — a missing implementation, a credential
     * fault, an outage. Reported as `failed` (not `skipped`) so the job retries
     * and an operator sees it, and nothing is written to the store: a transient
     * outage must not leave a `rejected` record that reads as a seller problem.
     */
    callFailure = normalizeError(err).message;
    ctx.logger.error("settlementVendorRegister: registration call failed", err, {
      storeSlug,
      gateway,
    });
  }
  if (!result) {
    return {
      summary: { total: 1, succeeded: 0, skipped: 0, failed: 1 },
      succeeded: [],
      skipped: [],
      failed: [
        {
          id: storeSlug,
          reason: callFailure ?? "the registration call returned nothing",
        },
      ],
    };
  }

  const status = STATUS_BY_OUTCOME[result.outcome];
  const record: StoreSettlementVendor = {
    vendorId: result.vendorId || storeSlug,
    status,
    ...(result.message ? { message: result.message } : {}),
    ...(status === SettlementVendorStatusValues.ACTIVE ? { registeredAt: ctx.now } : {}),
    lastAttemptAt: ctx.now,
    attempts: priorAttempts + 1,
  };
  await storeRepository.setSettlementVendor(storeSlug, gateway, record);

  /*
   * ── Blocker #3: the destination stops being self-asserted ────────────────
   *
   * 🛑 The WHOLE `payoutDetails` map is written back, because Firestore
   * replaces a map field entirely — a partial write would destroy the account
   * number and the IFSC it does not mention. `ownerPlain.payoutDetails` is the
   * revealed plaintext and the repository's write hook re-encrypts it
   * (`encryptPayoutDetails`), so this round-trips rather than storing
   * ciphertext-of-ciphertext.
   *
   * 🛑 Best-effort. The vendor record above is the authoritative outcome; a
   * failed mirror write must not make the whole job retry and re-register. It
   * is reported rather than swallowed so a drift has a trace (Root Cause #59).
   */
  if (details) {
    try {
      await userRepository.update(store.ownerId, {
        payoutDetails: {
          ...details,
          verificationStatus: VERIFICATION_BY_OUTCOME[result.outcome],
          ...(result.message ? { verificationMessage: result.message } : {}),
          ...(result.outcome === "active" ? { verifiedAt: ctx.now } : {}),
        },
      });
    } catch (err) {
      const normalized = normalizeError(err);
      ctx.logger.warn(
        "settlementVendorRegister: vendor recorded, but the seller's payout verification status could not be updated",
        { storeSlug, ownerId: store.ownerId, error: normalized.message },
      );
    }
  }

  const registered = status === SettlementVendorStatusValues.ACTIVE;
  ctx.logger.info("settlementVendorRegister: complete", {
    storeSlug,
    gateway,
    status,
    /*
     * 🛑 The gateway's message is logged; the PAN, the account number and the
     * VPA are not, and must never be. `audit-pii-crypto`'s CIPHERTEXT_IN_MESSAGE
     * is about the inverse case and this is the plaintext one — worse.
     */
    ...(result.message ? { message: result.message } : {}),
  });

  return {
    summary: {
      total: 1,
      succeeded: registered ? 1 : 0,
      skipped: registered ? 0 : 1,
      failed: 0,
    },
    succeeded: registered ? [storeSlug] : [],
    skipped: registered ? [] : [storeSlug],
    failed: [],
    data: {
      storeSlug,
      gateway,
      vendorId: record.vendorId,
      status,
      ...(result.message ? { message: result.message } : {}),
    },
  };
}
