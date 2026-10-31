/*
 * WHY: A seller's payout DESTINATION was self-asserted. `updatePayoutSettings`
 *      set `isConfigured: true` unconditionally on both arms — measured
 *      2026-10-31 at `features/seller/actions/seller-actions.ts:404,414` — so a
 *      store could be "payout configured" with an IFSC that is not an IFSC and
 *      a VPA that is not a VPA. Nothing anywhere said otherwise until a payout
 *      failed, which is the one moment it is most expensive to find out.
 *
 *      It mattered less while payouts were a manual bookkeeping record (an
 *      admin read the details and transferred out of band, and a human notices
 *      a malformed IFSC). It stops being tolerable under SPLIT SETTLEMENT: the
 *      destination is handed to a payment aggregator at vendor-registration
 *      time, and a gateway that refuses the vendor leaves the store
 *      un-onboardable — i.e. unable to be paid at all — with the refusal
 *      arriving asynchronously, long after the seller saw a success toast.
 *
 * WHAT: The ONE definition of "is this payout destination well-formed", plus
 *       the verification lifecycle a gateway's own response drives.
 *
 * ## 🛑 FORMAT-VALID IS NOT BANK-VERIFIED, and the two must stay distinguishable
 *
 * `isConfigured` can only ever mean "the seller filled this in and it is the
 * right SHAPE". Whether the account exists, is live, and belongs to the person
 * named on it is a question only a bank (or a penny-drop, or an aggregator's
 * own account verification) can answer. Collapsing the two into one boolean is
 * what made `isConfigured: true` read as a guarantee it never was.
 *
 * So there are two fields with two owners:
 *   · `isConfigured`       — THIS module, from the format rules below.
 *   · `verificationStatus` — the GATEWAY, from its `createVendor` response.
 *
 * There is deliberately NO penny-drop here. We do not hold a banking licence
 * and have no account-validation API; inventing a local "verified" state would
 * be exactly the self-assertion this file exists to remove, one layer up.
 *
 * ## 🛑 Editing the destination RESETS the verification
 *
 * `resetVerificationOnChange` is applied on every write of payout details. A
 * status that outlived the account number it referred to would be a claim about
 * a destination nobody checked — and the direction it fails in is money leaving
 * for an account an aggregator approved and the seller has since replaced.
 *
 * There is no fingerprint of the destination, on purpose: a reset on every
 * write needs no stored hash to compare against, and a hash is one more thing
 * that can be computed differently at the two write paths (Root Cause #42).
 *
 * EXPORTS:
 *   IFSC_PATTERN, UPI_VPA_PATTERN, PAN_PATTERN,
 *   isValidIfsc, isValidUpiVpa, isValidPan, normalisePan,
 *   PAYOUT_VERIFICATION, PayoutVerificationStatus,
 *   PayoutDestinationIssue, payoutDestinationIssues,
 *   payoutDestinationIsWellFormed, resetVerificationOnChange
 *
 * @tag domain:payouts,payments
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:features/seller/actions,api/store/payout-settings,jobs/settlementVendorRegister
 * @tag sideEffects:none
 */

/**
 * `AAAA0XXXXXX` — four bank letters, a literal `0`, six branch characters.
 *
 * 🛑 This is the FIFTH place this pattern appeared and the only one intended to
 * survive. The others, measured 2026-10-31:
 *   · `features/seller/components/SellerPayoutSettingsView.tsx:126`
 *   · `features/store-extensions/schemas/payout-method-form.ts:45`
 *   · `src/actions/seller.actions.ts:122`
 *   · `src/app/api/store/payout-settings/route.ts:101`
 * Five copies of one format is five chances to disagree about what a valid
 * IFSC is (Root Cause #75), and the two that mattered — the appkit write path
 * and the action that calls it — had NO copy at all.
 */
export const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** `handle@psp` — the shape the existing seller form and payout-method schema both already enforce. */
export const UPI_VPA_PATTERN = /^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/;

/**
 * `AAAAA9999A` — five letters, four digits, one letter.
 *
 * 🛑 Shape only, and there is no checksum to add: unlike a GSTIN (whose 15th
 * character IS a base-36 check digit, which is why `isValidGstin` can verify
 * more than a shape) a PAN carries no check character that can be recomputed.
 * The fourth letter encodes holder type and the fifth the surname initial, and
 * neither is something we can validate against anything we hold. So a
 * well-formed PAN is a well-formed PAN and nothing more — do not add a
 * "verified" meaning to this function later.
 */
export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export function isValidIfsc(raw: string | undefined | null): boolean {
  if (!raw) return false;
  return IFSC_PATTERN.test(raw.trim().toUpperCase());
}

export function isValidUpiVpa(raw: string | undefined | null): boolean {
  if (!raw) return false;
  return UPI_VPA_PATTERN.test(raw.trim());
}

export function isValidPan(raw: string | undefined | null): boolean {
  if (!raw) return false;
  return PAN_PATTERN.test(raw.trim().toUpperCase());
}

/** Upper-cased and trimmed, or `undefined` for a blank — a PAN is never stored mixed-case. */
export function normalisePan(raw: string | undefined | null): string | undefined {
  const value = raw?.trim().toUpperCase();
  return value ? value : undefined;
}

/**
 * The verification lifecycle, and who writes each value.
 *
 * 🛑 `unverified` is the DEFAULT and an absent field means exactly that. It is
 * not "unknown": a destination nobody has checked is unverified, and reading
 * absence as anything better is how `isConfigured: true` came to mean nothing.
 */
export const PAYOUT_VERIFICATION = {
  /** Format-valid at most. Written by this module on every destination change. */
  UNVERIFIED: "unverified",
  /** Handed to a gateway; its answer has not arrived. Written by the registration job. */
  PENDING: "pending",
  /** A gateway accepted the destination. Written ONLY from a gateway response. */
  VERIFIED: "verified",
  /** A gateway refused it. `verificationMessage` carries its reason verbatim. */
  FAILED: "failed",
} as const;

export type PayoutVerificationStatus =
  (typeof PAYOUT_VERIFICATION)[keyof typeof PAYOUT_VERIFICATION];

export interface PayoutDestinationIssue {
  /** Dotted field path, so `applyZodIssues`-shaped callers can attach it. */
  path: string;
  message: string;
}

/** The subset of `SellerPayoutDetails` these rules read. */
export interface PayoutDestinationLike {
  method: "upi" | "bank_transfer";
  upiId?: string;
  bankAccount?: {
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
  };
}

/**
 * Everything wrong with this destination, as a list rather than a throw.
 *
 * A list because both call sites need all of it at once: the server action
 * attaches one issue per field, and the registration job records WHY a store
 * could not be onboarded. Stopping at the first problem would make a seller fix
 * one field per round trip.
 *
 * 🛑 Reports on what is PRESENT. A bank destination with no `accountNumber` is
 * reported as missing, because the seller form supports "leave blank to keep
 * the saved number" and the keep-existing semantics belong to the write path —
 * so the write path passes the RESOLVED destination (merged with what is
 * stored), never the raw form values. Checking the form values here would
 * reject every legitimate blank re-save.
 */
export function payoutDestinationIssues(
  details: PayoutDestinationLike | undefined | null,
): PayoutDestinationIssue[] {
  if (!details) {
    return [{ path: "method", message: "Payout details are required." }];
  }
  const issues: PayoutDestinationIssue[] = [];

  if (details.method === "upi") {
    if (!details.upiId?.trim()) {
      issues.push({ path: "upiId", message: "A UPI ID is required." });
    } else if (!isValidUpiVpa(details.upiId)) {
      issues.push({
        path: "upiId",
        message: "Please enter a valid UPI ID, e.g. name@bank.",
      });
    }
    return issues;
  }

  const bank = details.bankAccount;
  if (!bank) {
    return [{ path: "bankAccount", message: "Bank account details are required." }];
  }
  if (!bank.accountHolderName?.trim()) {
    issues.push({
      path: "bankAccount.accountHolderName",
      message: "The account holder's name is required.",
    });
  }
  if (!bank.accountNumber?.trim()) {
    issues.push({
      path: "bankAccount.accountNumber",
      message: "An account number is required.",
    });
  } else if (!/^\d{9,18}$/.test(bank.accountNumber.trim())) {
    issues.push({
      path: "bankAccount.accountNumber",
      message: "An account number is 9–18 digits.",
    });
  }
  if (!isValidIfsc(bank.ifscCode)) {
    issues.push({
      path: "bankAccount.ifscCode",
      message: "Please enter a valid IFSC code, e.g. HDFC0001234.",
    });
  }
  if (!bank.bankName?.trim()) {
    issues.push({ path: "bankAccount.bankName", message: "The bank name is required." });
  }
  return issues;
}

/**
 * Is this destination well-formed? **This, and only this, is what
 * `isConfigured` means.**
 */
export function payoutDestinationIsWellFormed(
  details: PayoutDestinationLike | undefined | null,
): boolean {
  return payoutDestinationIssues(details).length === 0;
}

/**
 * The verification fields to write alongside a CHANGED destination.
 *
 * Returned as an object to spread rather than applied in place, so the write
 * path cannot forget the message and the timestamp while remembering the
 * status — three fields that must move together or the UI shows a stale reason
 * under a fresh status.
 */
export function resetVerificationOnChange(): {
  verificationStatus: PayoutVerificationStatus;
  verificationMessage?: string;
  verifiedAt?: Date;
} {
  return {
    verificationStatus: PAYOUT_VERIFICATION.UNVERIFIED,
    /*
     * Explicitly `undefined` rather than omitted, and the clearing works
     * because `payoutDetails` is written as a WHOLE MAP: every write path does
     * `userRepository.update(uid, { payoutDetails: details })`, and Firestore
     * replaces a map field entirely, so keys absent from the new object are
     * gone. Naming them here is what stops a caller spreading a reset and
     * keeping the old reason — "failed: account not found" rendered under
     * "unverified" is worse than either state alone.
     */
    verificationMessage: undefined,
    verifiedAt: undefined,
  };
}
