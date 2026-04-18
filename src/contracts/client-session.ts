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

export function registerClientSessionAdapter(
  adapter: IClientSessionAdapter,
): void {
  _adapter = adapter;
}

export function getClientSessionAdapter(): IClientSessionAdapter {
  if (!_adapter) {
    throw new Error(
      "Client session adapter not registered. " +
        "Call registerClientSessionAdapter() before using SessionProvider.",
    );
  }
  return _adapter;
}
