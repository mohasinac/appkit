"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

export interface FirebaseRealtimeClient {
  realtimeApp: FirebaseApp;
  realtimeDb: Database;
}

const firebaseClientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

export function getFirebaseRealtimeClient(
  appName: string,
): FirebaseRealtimeClient {
  const canInitializeRealtimeClient =
    typeof window !== "undefined" && Boolean(firebaseClientConfig.databaseURL);

  const realtimeApp: FirebaseApp = canInitializeRealtimeClient
    ? (getApps().find((a) => a.name === appName) ??
      initializeApp(firebaseClientConfig, appName))
    : (null as unknown as FirebaseApp);

  const realtimeDb: Database = canInitializeRealtimeClient
    ? getDatabase(realtimeApp)
    : (null as unknown as Database);

  return { realtimeApp, realtimeDb };
}
