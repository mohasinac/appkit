/**
 * Firebase Client SDK provider implementations.
 *
 * Consumer apps import these and register them in their client-side
 * provider setup (e.g., a `Providers` component or layout).
 */

export { FirebaseClientRealtimeProvider } from "./realtime";
export type { FirebaseClientRealtimeConfig } from "./realtime";
export { FirebaseClientAuthProvider } from "./auth";
