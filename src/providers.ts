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
  FirebaseRealtimeRepository,
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

// Payment (Razorpay)
export {
  RazorpayProvider,
  rupeesToPaise,
  paiseToRupees,
  verifyPaymentSignature,
  createRazorpayOrder,
  fetchRazorpayOrder,
  verifyPaymentSignatureWithKeys,
  verifyWebhookSignature,
  createRazorpayRefund,
} from "./providers/payment-razorpay/index";
export type {
  RazorpayConfig,
  RazorpayPaymentResult,
  RazorpayOrderOptions,
  RazorpayOrder,
  RazorpayRefundResult,
} from "./providers/payment-razorpay/index";

// Shipping (Shiprocket)
export { ShiprocketProvider } from "./providers/shipping-shiprocket/index";
export type { ShiprocketProviderConfig } from "./providers/shipping-shiprocket/index";

// Style adapter
export { tailwindAdapter } from "./style/tailwind/index";

// Monitoring
// serverLogger - Structured server-side logger (useful in instrumentation / provider setup).
export { serverLogger } from "./monitoring/index";
