/**
 * Auth server actions — thin re-exports. Session management stays client-side
 * (next-auth-style cookie + client SDK); the server surface is limited to
 * mutations (email verify / password reset / OTP issue) and the `/auth/me`
 * route handler.
 */

export { authMeGET } from "../../../../features/auth/api/route";
export * from "../../../../features/auth/consent-otp";
