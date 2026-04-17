"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
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

  constructor(config: FirebaseClientRealtimeConfig) {
    const appName = config.appName ?? "appkit-realtime";
    this.app =
      getApps().find((a) => a.name === appName) ??
      initializeApp(config.firebaseConfig, appName);
    this.db = getDatabase(this.app);
  }

  async signInWithToken(token: string): Promise<void> {
    await signInWithCustomToken(getAuth(this.app), token);
  }

  async signOut(): Promise<void> {
    try {
      await signOut(getAuth(this.app));
    } catch {
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
