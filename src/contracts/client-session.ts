/**
 * Client-side session adapter contract.
 *
 * Abstracts the auth-state listener, token retrieval, and sign-out
 * so that SessionContext never imports a specific auth SDK directly.
 * Register a concrete implementation (Firebase, Supabase, Clerk, etc.)
 * via `registerClientSessionAdapter()`.
 */

/**
 * Minimal auth user shape returned by the session adapter.
 * Contains only the fields the auth SDK can provide without a server round-trip.
 */
export interface AdapterAuthUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  /** Retrieve a fresh ID token for server session creation. */
  getIdToken(forceRefresh?: boolean): Promise<string>;
}

/** Unsubscribe function returned by onAuthStateChanged */
export type AuthUnsubscribe = () => void;

export interface IClientSessionAdapter {
  /**
   * Subscribe to auth state changes.
   * Callback receives the current user or null when signed out.
   */
  onAuthStateChanged(
    callback: (user: AdapterAuthUser | null) => void,
  ): AuthUnsubscribe;

  /** Return the currently signed-in user, or null. */
  getCurrentUser(): AdapterAuthUser | null;

  /** Sign out of the client-side auth SDK. */
  signOut(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Runtime registry (same pattern as IClientAuthProvider / IClientRealtimeProvider)
// ---------------------------------------------------------------------------

let _adapter: IClientSessionAdapter | null = null;

/**
 * No-op guest adapter used when no real adapter has been registered.
 * Allows SessionProvider to render in "not signed in" mode without crashing.
 */
const GUEST_ADAPTER: IClientSessionAdapter = {
  onAuthStateChanged(callback) {
    callback(null);
    return () => {};
  },
  getCurrentUser() {
    return null;
  },
  signOut() {
    return Promise.resolve();
  },
};

export function registerClientSessionAdapter(
  adapter: IClientSessionAdapter,
): void {
  _adapter = adapter;
}

export function getClientSessionAdapter(): IClientSessionAdapter {
  return _adapter ?? GUEST_ADAPTER;
}
