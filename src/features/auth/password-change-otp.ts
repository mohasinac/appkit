/**
 * Password Change OTP.
 *
 * Root-caused 2026-08-20: POST /api/user/change-password validated the
 * *shape* of `currentPassword` (Zod: non-empty, differs from newPassword)
 * but the handler never read or verified it — `getAdminAuth().updateUser()`
 * overwrote the password unconditionally for whatever `uid` the session
 * cookie carried. The only real current-password check
 * (`reauthenticateWithCredential` in the Firebase client SDK) happens in
 * the browser and is trivially bypassed by calling the API directly with a
 * stolen session cookie — a session hijack (XSS, log leak, etc.) was
 * enough to take over the account's password with zero server-enforced
 * identity check. This module gates the actual server-side write behind an
 * email OTP, verified server-side, mirroring the Tier PP checkout-value-OTP
 * pattern exactly (same crypto primitives, reused not duplicated) so a
 * session-cookie thief also needs access to the account's inbox.
 */

import { AuthorizationError } from "../../errors";
import { resolveDate } from "../../utils";
import { USER_COLLECTION } from "./schemas";
import {
  hashOtp,
  generateOtpCode,
  CHECKOUT_VALUE_OTP_EXPIRY_MS as PASSWORD_CHANGE_OTP_EXPIRY_MS,
  CHECKOUT_VALUE_OTP_EXPIRY_MINUTES as PASSWORD_CHANGE_OTP_EXPIRY_MINUTES,
  CHECKOUT_VALUE_OTP_COOLDOWN_MS as PASSWORD_CHANGE_OTP_COOLDOWN_MS,
  CHECKOUT_VALUE_OTP_MAX_ATTEMPTS as PASSWORD_CHANGE_OTP_MAX_ATTEMPTS,
  CHECKOUT_VALUE_OTP_VERIFY_RATE_LIMIT as PASSWORD_CHANGE_OTP_VERIFY_RATE_LIMIT,
} from "./checkout-value-otp";

export {
  hashOtp,
  generateOtpCode,
  PASSWORD_CHANGE_OTP_EXPIRY_MS,
  PASSWORD_CHANGE_OTP_EXPIRY_MINUTES,
  PASSWORD_CHANGE_OTP_COOLDOWN_MS,
  PASSWORD_CHANGE_OTP_MAX_ATTEMPTS,
  PASSWORD_CHANGE_OTP_VERIFY_RATE_LIMIT,
};

type Db = FirebaseFirestore.Firestore;

/** Single-slot doc per user — a user can only be mid-password-change once. */
export function passwordChangeOtpRef(db: Db, uid: string) {
  return db
    .collection(USER_COLLECTION)
    .doc(uid)
    .collection("passwordChangeOtps")
    .doc("current");
}

export function passwordChangeOtpRateLimitRef(db: Db, uid: string) {
  return db
    .collection(USER_COLLECTION)
    .doc(uid)
    .collection("passwordChangeOtpRateLimit")
    .doc("meta");
}

export interface PasswordChangeOtpDoc {
  codeHash: string;
  expiresAt: FirebaseFirestore.Timestamp;
  attempts: number;
  verified: boolean;
}

/**
 * Enforce the per-user send rate-limit.
 * Throws AuthorizationError("passwordChangeOtpRateLimit") when throttled.
 */
export async function enforcePasswordChangeOtpRateLimit(
  db: Db,
  uid: string,
): Promise<void> {
  const metaRef = passwordChangeOtpRateLimitRef(db, uid);

  await db.runTransaction(async (tx: FirebaseFirestore.Transaction) => {
    const metaSnap = await tx.get(metaRef);
    const meta = metaSnap.exists
      ? (metaSnap.data() as { lastSentAt?: FirebaseFirestore.Timestamp })
      : null;

    const lastSentMs = resolveDate(meta?.lastSentAt)?.getTime() ?? 0;
    const elapsed = Date.now() - lastSentMs;

    if (elapsed < PASSWORD_CHANGE_OTP_COOLDOWN_MS) {
      throw new AuthorizationError("passwordChangeOtpRateLimit");
    }
    tx.set(metaRef, { lastSentAt: new Date() }, { merge: true });
  });
}
