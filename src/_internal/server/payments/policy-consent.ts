/**
 * THE CONSENT GATE — server-side enforcement of the buyer policy agreement
 * (item 1.39, on the plan's "never cut" list).
 *
 * ## Why server-side at all
 *
 * A checkbox in the browser is an affordance, not a gate. `POST /api/checkout`
 * and `POST /api/payment/create-order` are both reachable by a hand-rolled
 * request, so a client-only tick means the one legal protection the
 * no-refund-after-reveal mechanic has is a field the server never looked at —
 * Root Cause #46's exact shape (a field the schema accepts and the handler
 * never verifies). An order that arrives without consent is REJECTED here, not
 * logged and allowed.
 *
 * ## What is actually verified
 *
 * The client does not get to say what it agreed to. It echoes back the
 * `version` + `hash` it was handed, and this gate:
 *
 *   1. re-resolves the applicable clause set **from the cart's own listing
 *      types and the live settings**, through the capability registry;
 *   2. re-computes the hash over that resolution;
 *   3. refuses unless the echo matches.
 *
 * So the three ways this could be defeated are all closed: not ticking it
 * (`accepted !== true` → refused), forging a hash (mismatch → refused), and
 * ticking a weaker policy than the cart actually requires (the server's own
 * resolution is what gets hashed, so a cart that grew a concealed item after
 * the box was ticked produces a different hash → refused, and the buyer is
 * asked again). That last case is the one a client-trusting design misses.
 *
 * ## Two distinct refusals, deliberately
 *
 *   `BUYER_POLICY_CONSENT_REQUIRED` nothing was agreed — the UI must show the
 *                                   step. A bug or a scripted request.
 *   `BUYER_POLICY_CONSENT_STALE`    something was agreed, but not THIS policy
 *                                   — the UI must re-fetch and re-ask.
 *
 * Collapsing them into one code would make a perfectly honest buyer whose cart
 * changed mid-checkout indistinguishable from a forged request, and the right
 * UI response to the two is different.
 */

/* `node:crypto`, not the bare `crypto` specifier — the bare form also resolves
 * to the WHATWG `Crypto` global in some bundler configurations, and silently
 * getting a different module on the call that hashes a legal record is not a
 * failure worth risking for one saved prefix. */
import { createHash } from "node:crypto";

import { ApiError } from "../../../errors/api-error";
/*
 * The authority check for the admin bypass. Lane R's `permissionsFor` union,
 * reached through the one server resolver — never a second role comparison
 * here. See `requestAdminBypass`.
 */
import {
  checkPermission,
  getServerPermissions,
} from "../features/auth/permissions";
import { serverLogger } from "../../../monitoring/server-logger";
import { normalizeError } from "../../../errors/normalize";
import {
  buyerPolicyConsentRepository,
} from "../../../features/checkout/repository/buyer-policy-consent.repository";
import type { ListingType } from "../../../features/products/types/index";
import {
  canonicalisePolicyClauses,
  resolveCheckoutPolicyClauses,
  resolveCheckoutPolicyVersion,
  type CheckoutPolicyOffer,
  type CheckoutPolicySettings,
  type OrderPolicyConsent,
} from "../../shared/checkout/policy-consent";

/** Thrown as the message of a 403 so the client can branch on the reason. */
export const POLICY_CONSENT_REQUIRED_CODE = "BUYER_POLICY_CONSENT_REQUIRED";
export const POLICY_CONSENT_STALE_CODE = "BUYER_POLICY_CONSENT_STALE";
/**
 * 5xx, not 4xx — and the distinction is the money path.
 *
 * Raised only on the POST-capture placement path, when the consent record the
 * pre-capture request wrote cannot be read back. The buyer did everything
 * right and their money is already captured, so refusing permanently would
 * strand it (the 2026-10-21 shape). A 5xx asks the gateway to redeliver, which
 * is the gateway's own retry schedule doing the recovery for us; if it never
 * resolves, a `WEBHOOK_PLACEMENT_FAILED` row is waiting for a human. What it
 * must NOT do is place a consentless order and move on.
 */
export const POLICY_CONSENT_UNRESOLVED_CODE = "BUYER_POLICY_CONSENT_UNRESOLVED";
/**
 * The caller supplied no listing types, so there was nothing to consent ABOUT.
 *
 * 400 rather than 403: this is a malformed call, not a refused buyer. It must
 * never be reachable from a real checkout (an empty cart is refused upstream),
 * which is exactly why it is an explicit code — if it ever appears in the logs
 * it names a caller that would otherwise have been issued a consent record
 * attesting to nothing.
 */
export const POLICY_CONSENT_NO_SUBJECT_CODE = "BUYER_POLICY_CONSENT_NO_SUBJECT";
/**
 * An admin-bypass was REQUESTED by a caller that does not hold
 * `admin:checkout:bypass`. A hard 403, never a quiet fall-through to the normal
 * consent path — see `requestAdminBypass`.
 */
export const POLICY_CONSENT_BYPASS_FORBIDDEN_CODE = "BUYER_POLICY_CONSENT_BYPASS_FORBIDDEN";

export function hashPolicyClauses(
  clauses: readonly { id: string; text: string }[],
): string {
  return createHash("sha256")
    .update(canonicalisePolicyClauses(clauses), "utf8")
    .digest("hex");
}

/**
 * What to show the buyer, and what the gate will expect back.
 *
 * ONE function behind both the UI and the gate, so the offer the buyer sees
 * and the offer the server judges are the same computation over the same
 * inputs. Two code paths deriving "the current policy" independently is how a
 * buyer ends up permanently unable to check out: the UI offers v1 and the gate
 * demands v2, forever.
 */
export function resolveCheckoutPolicyOffer(
  settings: CheckoutPolicySettings | undefined,
  listingTypes: readonly ListingType[],
  /**
   * §C — the tender, for clauses carrying `appliesWhenPaymentMethod`.
   *
   * 🛑 BOTH the UI offer and the gate must pass the SAME value, or they
   * compute different clause sets and therefore different hashes, and the
   * buyer is permanently unable to check out — the exact failure this
   * function's own header exists to prevent. The UI learns the method when the
   * buyer picks one and re-fetches the offer; the gate uses the method it is
   * about to write onto the order.
   */
  paymentMethod?: string,
): CheckoutPolicyOffer {
  const clauses = resolveCheckoutPolicyClauses(settings, listingTypes, paymentMethod);
  return {
    version: resolveCheckoutPolicyVersion(settings),
    hash: hashPolicyClauses(clauses),
    clauses,
  };
}

/** What a client is allowed to send. Nothing here is trusted on its own. */
export interface SubmittedPolicyConsent {
  accepted?: boolean;
  version?: number;
  hash?: string;
}

export interface AssertBuyerPolicyConsentInput {
  uid: string;
  /**
   * The listing types in this checkout. Resolved by the CALLER from the cart
   * it is about to place, for the same reason `assertCheckoutValueOtp` takes
   * an amount: a gate that derives its own subject from whatever is in scope
   * cannot be reused by a caller that did not exist when it was written.
   */
  listingTypes: readonly ListingType[];
  /**
   * §C — the tender this checkout will use, for clauses restricted by
   * `appliesWhenPaymentMethod` (cash on delivery today).
   *
   * ⚠ Optional for the same reason as on the resolver: a caller that has not
   * been updated still gets every unrestricted clause enforced. What it loses
   * is only the COD-specific pair, and it loses them CONSISTENTLY -- offer and
   * gate both omit them -- so the failure mode is a missing clause, never an
   * unplaceable order.
   */
  paymentMethod?: string;
  settings: CheckoutPolicySettings | undefined;
  submitted: SubmittedPolicyConsent | undefined;
  capturedOn: OrderPolicyConsent["capturedOn"];
  /**
   * REQUEST the admin-bypass path — a request, never a claim that is believed.
   *
   * 🛑 THIS FIELD GRANTS NOTHING ON ITS OWN, and the previous shape
   * (`adminBypass?: boolean`, trusted) was a privilege escalation waiting for
   * a call site: the first handler to write `adminBypass: body.adminBypass`
   * would have made the entire consent gate switchable off by any client, on
   * the one gate whose whole purpose is legal defensibility. A boolean
   * parameter cannot carry proof of authority — only an authority check can.
   *
   * So when this is true the gate RE-RESOLVES the caller's permissions for
   * `uid` and requires `admin:checkout:bypass`. Absent → **403**, not a
   * silent downgrade to the normal path: a caller asking for a bypass it does
   * not hold is either a bug or an attack, and both deserve to be loud.
   *
   * 🛑 Even when granted, this is NOT an exemption from the consent RECORD. An
   * admin test order is the platform agreeing with itself, and the record is
   * still written (tagged `admin-bypass`) so the audit trail has no silent
   * holes. What the bypass skips is only the requirement that a human ticked a
   * box — because on that path there is no buyer in the room.
   */
  requestAdminBypass?: boolean;
}

/** The permission an admin-bypass checkout must hold. Same string the route gates on. */
const ADMIN_BYPASS_PERMISSION = "admin:checkout:bypass" as const;

/**
 * Enforce the agreement and RETURN THE RECORD to stamp on the order(s).
 *
 * Throws `ApiError(403)` when consent is absent or stale. Returns the consent
 * snapshot otherwise — the caller writes it onto every order this checkout
 * produces, which is what makes "show me the text this buyer accepted"
 * answerable from the order alone.
 *
 * 🛑 Call it BEFORE any mutation and BEFORE any capture. Taking consent after
 * the money moves means charging a buyer and then asking whether they agreed,
 * which is the same error the OTP gate's header warns about.
 */
export async function assertBuyerPolicyConsent(
  input: AssertBuyerPolicyConsentInput,
): Promise<OrderPolicyConsent> {
  const { uid, listingTypes, settings, submitted, capturedOn, requestAdminBypass, paymentMethod } =
    input;

  /*
   * 🛑 AN EMPTY SUBJECT IS A REFUSAL, NOT A TRIVIAL PASS.
   *
   * With `listingTypes: []` every capability-gated clause drops out, the
   * baseline clause alone resolves, it hashes consistently, and the gate would
   * PASS — manufacturing a valid-looking consent record that attests to
   * nothing about the goods. A caller that reaches a consent gate with nothing
   * to consent to has already gone wrong (an empty cart is refused upstream
   * with CART_EMPTY), so the honest answer is to refuse rather than to issue a
   * record whose silence would later read as agreement.
   *
   * Asserted here rather than left to each call site precisely because "the
   * caller already checked" is how a gate ends up with one caller that did not.
   */
  if (listingTypes.length === 0) {
    serverLogger.error("policy consent refused: no listing types supplied", {
      uid,
      capturedOn,
    });
    throw new ApiError(400, POLICY_CONSENT_NO_SUBJECT_CODE);
  }

  /*
   * ── THE AUTHORITY CHECK, before anything is skipped ──────────────────────
   *
   * Resolved through Lane R's `permissionsFor` union (via
   * `getServerPermissions`), never a second role comparison of our own — one
   * authority helper, so a change to what `admin:checkout:bypass` means cannot
   * leave this gate behind.
   */
  let adminBypass = false;
  if (requestAdminBypass) {
    const resolved = await getServerPermissions(uid);
    if (!checkPermission(resolved, ADMIN_BYPASS_PERMISSION)) {
      serverLogger.error(
        "policy consent: admin-bypass REQUESTED by a caller without admin:checkout:bypass — refused",
        { uid },
      );
      throw new ApiError(403, POLICY_CONSENT_BYPASS_FORBIDDEN_CODE);
    }
    adminBypass = true;
  }

  /*
   * 🛑 `paymentMethod` MUST be passed here. Omitting it would resolve the
   * clause set WITHOUT the COD clauses, hash that set, and then compare it to
   * a buyer who correctly accepted the set including them -- a hash mismatch
   * on every COD checkout, reported as BUYER_POLICY_CONSENT_STALE, which
   * reads as "the buyer agreed to an old policy" rather than "the gate forgot
   * an input". The UI and the gate must compute over identical inputs.
   */
  const offer = resolveCheckoutPolicyOffer(settings, listingTypes, paymentMethod);
  const snapshotClauses = offer.clauses.map((clause) => ({
    id: clause.id,
    text: clause.text,
  }));

  if (!adminBypass) {
    if (submitted?.accepted !== true) {
      /*
       * `=== true`, not truthiness. A JSON body can carry `"accepted": "false"`
       * — a non-empty string, therefore truthy — and a consent gate that reads
       * the string "false" as agreement is worse than no gate, because it
       * manufactures a record saying the buyer agreed.
       */
      throw new ApiError(403, POLICY_CONSENT_REQUIRED_CODE);
    }
    if (submitted.hash !== offer.hash) {
      serverLogger.warn("policy consent rejected: hash mismatch", {
        uid,
        submittedHash: submitted.hash ? `${submitted.hash.slice(0, 12)}…` : "(absent)",
        expectedHash: `${offer.hash.slice(0, 12)}…`,
        submittedVersion: submitted.version,
        expectedVersion: offer.version,
      });
      throw new ApiError(403, POLICY_CONSENT_STALE_CODE);
    }
  }

  const record = await buyerPolicyConsentRepository.record({
    uid,
    version: offer.version,
    hash: offer.hash,
    clauses: snapshotClauses,
    capturedOn: adminBypass ? "admin-bypass" : capturedOn,
  });

  return {
    consentId: record.id,
    buyerId: uid,
    version: record.version,
    hash: record.hash,
    acceptedAt: record.acceptedAt,
    clauses: record.clauses,
    capturedOn: record.capturedOn,
  };
}

/**
 * Read back a consent taken on an EARLIER request, for the post-capture
 * placement path.
 *
 * The online-gateway flow takes consent at create-order time — before the
 * money moves — and carries only the record's id through the gateway's
 * passthrough channel (`CheckoutIntentMetadata.policyConsentId`), because that
 * channel is capped at 10 keys / 255 chars and silently truncates. The clause
 * text could not survive it; an id can.
 *
 * 🛑 The id is UNTRUSTED. It arrives from a metadata field, so ownership is
 * re-checked against the uid the order is actually being placed for. Without
 * that, a crafted `notes` payload could attach somebody else's consent record
 * to this order — which would read, in the audit trail, as that person having
 * agreed to this purchase.
 */
export async function loadBuyerPolicyConsent(input: {
  consentId: string | undefined;
  uid: string;
}): Promise<OrderPolicyConsent> {
  const { consentId, uid } = input;
  if (!consentId) {
    /*
     * No id at all. Either the create-order request predates this gate (a
     * payment started before deploy and confirmed after) or the passthrough
     * was lost. Both are 5xx-shaped: see the code's own note — the buyer's
     * money is captured and placing a consentless order is the one outcome
     * that is not allowed.
     */
    serverLogger.error("policy consent unresolved: no consent id on the placement path", { uid });
    throw new ApiError(503, POLICY_CONSENT_UNRESOLVED_CODE);
  }

  let record = null;
  try {
    record = await buyerPolicyConsentRepository.findById(consentId);
  } catch (err) {
    void normalizeError(err);
    serverLogger.error("policy consent unresolved: read failed", { uid, consentId, err });
    throw new ApiError(503, POLICY_CONSENT_UNRESOLVED_CODE);
  }

  if (!record) {
    serverLogger.error("policy consent unresolved: no such record", { uid, consentId });
    throw new ApiError(503, POLICY_CONSENT_UNRESOLVED_CODE);
  }
  if (record.uid !== uid) {
    /*
     * A record that exists but belongs to someone else. This is the forged
     * case, not the lost case, so it is a hard 403 rather than a retryable
     * 5xx — redelivering it would never make it legitimate.
     */
    serverLogger.error("policy consent rejected: record belongs to another buyer", {
      uid,
      consentId,
    });
    throw new ApiError(403, POLICY_CONSENT_REQUIRED_CODE);
  }

  return {
    consentId: record.id,
    buyerId: record.uid,
    version: record.version,
    hash: record.hash,
    acceptedAt: record.acceptedAt,
    clauses: record.clauses,
    capturedOn: record.capturedOn,
  };
}

/**
 * Append the placed order ids to the consent record. Fire-and-forget by
 * design — the authoritative consent copy is already on each order, so a
 * failure here loses a convenience index and nothing else. It must never turn
 * a successful placement into a failure.
 */
export async function attachOrdersToPolicyConsent(
  consentId: string,
  orderIds: string[],
): Promise<void> {
  try {
    await buyerPolicyConsentRepository.attachOrders(consentId, orderIds);
  } catch (err) {
    void normalizeError(err);
    serverLogger.warn("policy consent: order-id backlink failed", { consentId, err });
  }
}
