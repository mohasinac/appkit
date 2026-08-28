/**
 * Client-side realtime database provider contract.
 *
 * Abstracts RTDB operations so hooks never import a specific SDK.
 * Register a concrete implementation (Firebase, Supabase, Ably, etc.)
 * via `registerClientRealtimeProvider()`.
 */

/** Snapshot returned by a realtime subscription */
export interface RealtimeSnapshot {
  exists(): boolean;
  val(): unknown;
}

/** Unsubscribe function returned by subscribe */
export type Unsubscribe = () => void;

export interface IClientRealtimeProvider {
  /**
   * A provider on its own Firebase app for this claim scope, so concurrent
   * channels do not overwrite each other's auth. Optional: a provider that
   * cannot isolate returns itself, keeping the old shared-app behaviour.
   */
  forScope?(scope: string): IClientRealtimeProvider;
  /** Authenticate the realtime connection with a custom token */
  signInWithToken(token: string): Promise<void>;

  /** Sign out of the realtime connection */
  signOut(): Promise<void>;

  /** Subscribe to a path. Returns an unsubscribe function. */
  subscribe(
    path: string,
    onData: (snapshot: RealtimeSnapshot) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe;
}

// --- Runtime registry ------------------------------------------------------
let _provider: IClientRealtimeProvider | null = null;

export function registerClientRealtimeProvider(
  provider: IClientRealtimeProvider,
): void {
  _provider = provider;
}

export function getClientRealtimeProvider(): IClientRealtimeProvider {
  if (!_provider) {
    throw new Error(
      "Client realtime provider not registered. Call registerClientRealtimeProvider() before using realtime hooks.",
    );
  }
  return _provider;
}
