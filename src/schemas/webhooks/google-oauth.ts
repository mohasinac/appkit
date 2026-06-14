// [SCHEMA] Google OAuth response envelopes (W7).
//
// Consumed by src/app/api/auth/google/callback/route.ts. Replaces the
// `signInData.idToken` property-existence guard with a Zod parse.

import { z } from "zod";

// ---------------------------------------------------------------------------
// Firebase Identity Toolkit signInWithIdp response (subset we depend on).
// ---------------------------------------------------------------------------

export const googleSignInWithIdpResponseSchema = z.object({
  federatedId: z.string().optional(),
  providerId: z.string().optional(),
  email: z.string().optional(),
  emailVerified: z.boolean().optional(),
  firstName: z.string().optional(),
  fullName: z.string().optional(),
  lastName: z.string().optional(),
  photoUrl: z.string().optional(),
  localId: z.string(),
  displayName: z.string().optional(),
  idToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.string(),
  oauthAccessToken: z.string().optional(),
  oauthExpireIn: z.number().int().optional(),
  rawUserInfo: z.string().optional(),
  kind: z.string().optional(),
});

export type GoogleSignInWithIdpResponse = z.infer<typeof googleSignInWithIdpResponseSchema>;

// ---------------------------------------------------------------------------
// google-auth-library `getTokenInfo` shape (subset).
// ---------------------------------------------------------------------------

export const googleTokenInfoSchema = z.object({
  sub: z.string().optional(),
  email: z.string().optional(),
  email_verified: z.union([z.boolean(), z.string()]).optional(),
  scopes: z.array(z.string()).optional(),
  expiry_date: z.number().int().optional(),
  azp: z.string().optional(),
  aud: z.string().optional(),
});

export type GoogleTokenInfo = z.infer<typeof googleTokenInfoSchema>;
