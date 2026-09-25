/**
 * @mohasinac/appkit/providers
 *
 * All provider implementations and the registry wiring helpers in one place.
 *
 * Import from this entrypoint in server-only setup code such as
 * `instrumentation.ts` / `providers.config.ts`.
 *
 * Client-side providers (FirebaseClientAuthProvider, FirebaseClientRealtimeProvider)
 * remain in `@mohasinac/appkit/client` because they require a browser environment.
 */

// Registry and market baseline
export { registerProviders, getProviders } from "./contracts/index";
export { configureMarketDefaults } from "./core/baseline-resolver";

// Auth (Firebase Admin)
export {
  firebaseAuthProvider,
  firebaseSessionProvider,
  createSessionCookieFromToken,
  createSessionCookie,
  verifyIdToken,
  verifySessionCookie,
  createMiddlewareAuthChain,
  requireAuth,
  requireRole,
  requireAuthUser,
  requireRoleUser,
  getUserFromRequest,
  requireAuthFromRequest,
  requireRoleFromRequest,
  revokeUserTokens,
} from "./providers/auth-firebase/index";

// Database (Firebase Firestore / RTDB)
export {
  firebaseDbProvider,
  getAdminApp,
  getAdminAuth,
  getAdminDb,
  getAdminStorage,
  getAdminRealtimeDb,
  _resetAdminSingletons,
  FirebaseRepository,
  BaseRepository,
  FirebaseSieveRepository,
  RTDB_PATHS,
  firebaseFieldOps,
  removeUndefined,
  prepareForFirestore,
  deserializeTimestamps,
} from "./providers/db-firebase/index";
export type { DocumentSnapshot } from "firebase-admin/firestore";

// Storage (Firebase Admin)
export { firebaseStorageProvider } from "./providers/storage-firebase/index";

// Email (Resend)
export { createResendProvider } from "./providers/email-resend/index";
export type { ResendProviderOptions } from "./providers/email-resend/index";

// Payment (PhonePe) — disabled by default; siteSettings.payment.phonepeEnabled turns it on
export { PhonePeProvider } from "./providers/payment-phonepe/index";
export type { PhonePeConfig } from "./providers/payment-phonepe/index";
export { rupeesToPaise, paiseToRupees } from "./core/money";

// Payment (manual) — the default provider
export { ManualPaymentProvider } from "./providers/payment-manual/index";

// Shipping (manual) — the default (and only) provider
export { ManualShippingProvider } from "./providers/shipping-manual/index";

// Style adapter
export { tailwindAdapter } from "./style/tailwind/index";

// Monitoring
// serverLogger - Structured server-side logger (useful in instrumentation / provider setup).
export { serverLogger } from "./monitoring/index";
