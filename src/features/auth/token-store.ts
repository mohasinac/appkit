import "server-only";
import crypto from "crypto";
import { getAdminDb, prepareForFirestore } from "../../providers/db-firebase";
import { resolveDate } from "../../utils";
import {
  EMAIL_VERIFICATION_COLLECTION,
  PASSWORD_RESET_COLLECTION,
} from "./schemas";

export interface TokenData {
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface PasswordResetTokenData extends TokenData {
  used: boolean;
  usedAt?: Date;
}

export interface TokenServiceConfig {
  emailVerificationExpiryMs?: number;
  passwordResetExpiryMs?: number;
}

export interface TokenErrorMessages {
  emailTokenInvalid?: string;
  emailTokenExpired?: string;
  passwordTokenInvalid?: string;
  passwordTokenExpired?: string;
  passwordTokenUsed?: string;
}

const DEFAULT_TOKEN_CONFIG: Required<TokenServiceConfig> = {
  emailVerificationExpiryMs: 24 * 60 * 60 * 1000,
  passwordResetExpiryMs: 60 * 60 * 1000,
};

const DEFAULT_TOKEN_ERRORS: Required<TokenErrorMessages> = {
  emailTokenInvalid: "Invalid verification token",
  emailTokenExpired: "Verification token has expired",
  passwordTokenInvalid: "Invalid password reset token",
  passwordTokenExpired: "Password reset token has expired",
  passwordTokenUsed: "Password reset token has already been used",
};

export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

export async function createVerificationToken(
  userId: string,
  email: string,
  config?: TokenServiceConfig,
): Promise<string> {
  const token = generateToken();
  const mergedConfig = { ...DEFAULT_TOKEN_CONFIG, ...config };
  const expiresAt = new Date(
    Date.now() + mergedConfig.emailVerificationExpiryMs,
  );

  const tokenData = prepareForFirestore({
    userId,
    email,
    token,
    expiresAt,
    createdAt: new Date(),
  });

  await getAdminDb()
    .collection(EMAIL_VERIFICATION_COLLECTION)
    .doc(token)
    .set(tokenData);

  return token;
}

export async function createPasswordResetToken(
  userId: string,
  email: string,
  config?: TokenServiceConfig,
): Promise<string> {
  const token = generateToken();
  const mergedConfig = { ...DEFAULT_TOKEN_CONFIG, ...config };
  const expiresAt = new Date(Date.now() + mergedConfig.passwordResetExpiryMs);

  const tokenData = prepareForFirestore({
    userId,
    email,
    token,
    expiresAt,
    createdAt: new Date(),
    used: false,
  });

  await getAdminDb()
    .collection(PASSWORD_RESET_COLLECTION)
    .doc(token)
    .set(tokenData);

  return token;
}

export async function verifyEmailToken(
  token: string,
  errors?: TokenErrorMessages,
): Promise<{
  valid: boolean;
  userId?: string;
  error?: string;
}> {
  const mergedErrors = { ...DEFAULT_TOKEN_ERRORS, ...errors };
  const tokenDoc = await getAdminDb()
    .collection(EMAIL_VERIFICATION_COLLECTION)
    .doc(token)
    .get();

  if (!tokenDoc.exists) {
    return { valid: false, error: mergedErrors.emailTokenInvalid };
  }

  const tokenData = tokenDoc.data();
  if (!tokenData) {
    return { valid: false, error: mergedErrors.emailTokenInvalid };
  }

  const expiresAt = resolveDate(tokenData.expiresAt);
  if (!expiresAt || expiresAt < new Date()) {
    await getAdminDb()
      .collection(EMAIL_VERIFICATION_COLLECTION)
      .doc(token)
      .delete();
    return { valid: false, error: mergedErrors.emailTokenExpired };
  }

  await getAdminDb()
    .collection(EMAIL_VERIFICATION_COLLECTION)
    .doc(token)
    .delete();
  return { valid: true, userId: tokenData.userId };
}

export async function verifyPasswordResetToken(
  token: string,
  errors?: TokenErrorMessages,
): Promise<{
  valid: boolean;
  userId?: string;
  error?: string;
}> {
  const mergedErrors = { ...DEFAULT_TOKEN_ERRORS, ...errors };
  const tokenDoc = await getAdminDb()
    .collection(PASSWORD_RESET_COLLECTION)
    .doc(token)
    .get();

  if (!tokenDoc.exists) {
    return { valid: false, error: mergedErrors.passwordTokenInvalid };
  }

  const tokenData = tokenDoc.data();
  if (!tokenData) {
    return { valid: false, error: mergedErrors.passwordTokenInvalid };
  }

  const expiresAt = resolveDate(tokenData.expiresAt);
  if (!expiresAt || expiresAt < new Date()) {
    await getAdminDb()
      .collection(PASSWORD_RESET_COLLECTION)
      .doc(token)
      .delete();
    return { valid: false, error: mergedErrors.passwordTokenExpired };
  }

  if (tokenData.used) {
    return { valid: false, error: mergedErrors.passwordTokenUsed };
  }

  return { valid: true, userId: tokenData.userId };
}

export async function markPasswordResetTokenAsUsed(
  token: string,
): Promise<void> {
  const updateData = prepareForFirestore({
    used: true,
    usedAt: new Date(),
  });

  await getAdminDb()
    .collection(PASSWORD_RESET_COLLECTION)
    .doc(token)
    .update(updateData);
}

export async function deleteToken(
  collection:
    | typeof EMAIL_VERIFICATION_COLLECTION
    | typeof PASSWORD_RESET_COLLECTION,
  token: string,
): Promise<void> {
  await getAdminDb().collection(collection).doc(token).delete();
}
