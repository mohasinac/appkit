import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { normalizeError } from "../../errors/normalize";
import {
  getDatabase,
  ref,
  onValue,
  off,
  type Database,
} from "firebase/database";
import { getAuth, signInWithCustomToken, signOut } from "firebase/auth";
import type {
  IClientRealtimeProvider,
  RealtimeSnapshot,
  Unsubscribe,
} from "../../contracts/client-realtime";

export interface FirebaseClientRealtimeConfig {
  /** Firebase client config for initializing the app */
  firebaseConfig: Record<string, string | undefined>;
  /** Name for the Firebase app instance (avoids colliding with the default app) */
  appName?: string;
}

/**
 * Firebase Realtime Database implementation of IClientRealtimeProvider.
 */
export class FirebaseClientRealtimeProvider implements IClientRealtimeProvider {
  private app: FirebaseApp;
  private db: Database;
  private readonly config: FirebaseClientRealtimeConfig;
  private readonly appName: string;
  private readonly scoped = new Map<string, FirebaseClientRealtimeProvider>();

  constructor(config: FirebaseClientRealtimeConfig) {
    const appName = config.appName ?? "appkit-realtime";
    this.config = config;
    this.appName = appName;
    this.app =
      getApps().find((a) => a.name === appName) ??
      initializeApp(config.firebaseConfig, appName);
    this.db = getDatabase(this.app);
  }

  /**
   * A provider bound to its OWN Firebase app for this claim scope.
   *
   * 🛑 This is what makes concurrent channels safe. Firebase Auth state is
   * per-app, so with one shared app every `signInWithToken` REPLACED the claims
   * of every other live subscriber: a bulk job signing in with a
   * `{ bulkJobId }`-only token instantly stripped `conversationIds` from an open
   * messages subscription, and vice versa. Whoever signed in last won.
   *
   * Reference-counting fixed only the sign-OUT half of that (a finishing job no
   * longer ends someone else's session). Sign-IN needed separate apps, because
   * there is nothing to coordinate — two channels legitimately need two
   * different claim sets at the same time.
   *
   * Apps are cached per scope and reused, so a remount does not leak one.
   */
  forScope(scope: string): IClientRealtimeProvider {
    const existing = this.scoped.get(scope);
    if (existing) return existing;
    // Firebase app names are freeform, but keep them predictable in devtools.
    const safe = scope.replace(/[^a-zA-Z0-9_-]/g, "-");
    const child = new FirebaseClientRealtimeProvider({
      ...this.config,
      appName: `${this.appName}-${safe}`,
    });
    this.scoped.set(scope, child);
    return child;
  }

  async signInWithToken(token: string): Promise<void> {
    await signInWithCustomToken(getAuth(this.app), token);
  }

  async signOut(): Promise<void> {
    try {
      await signOut(getAuth(this.app));
    } catch (_err) {
      void normalizeError(_err);
      // no-op — signing out of a secondary app can fail harmlessly
    }
  }

  subscribe(
    path: string,
    onData: (snapshot: RealtimeSnapshot) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    const dbRef = ref(this.db, path);
    const unsubscribe = onValue(dbRef, onData, onError);
    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      } else {
        off(dbRef);
      }
    };
  }
}
