/**
 * Resolve the Realtime Database URL from the environment.
 *
 * Its own module, with **no imports**, because both `admin.ts` and
 * `admin-app-lite.ts` need it and `admin-app-lite` exists precisely to avoid
 * pulling in the full admin module. They previously carried byte-for-byte
 * duplicate resolution logic, which meant the bug below existed twice.
 *
 * 🛑 Returns `undefined` rather than guessing.
 *
 * All six copies used to fall back to `https://${projectId}-default-rtdb.firebaseio.com`.
 * That is the **us-central1** URL shape; this project's instance lives at
 * `…-default-rtdb.asia-southeast1.firebasedatabase.app`. So whenever the env var
 * was missing, every server RTDB write silently targeted a database that does
 * not exist — and since all nine RTDB writers wrap their call in a swallowing
 * try/catch, messaging, bids, job status and payment signalling would every one
 * of them degrade to "nothing ever updates", with clean warn-level logs.
 *
 * A guessed URL cannot be correct for a non-default region, so guessing buys
 * nothing and costs the ability to notice. With no `databaseURL`,
 * `getAdminRealtimeDb()` fails loudly at first use instead, which is the
 * outcome you want.
 *
 * `||` not `??`: an env var that is present but empty must fall through, and
 * `??` only falls through on null/undefined.
 */
export function resolveRtdbUrl(): string | undefined {
  // 🛑 Emulator first.
  //
  // `firebase.json` has declared a database emulator on port 9000 for a long
  // time and NOTHING ever connected to it. Client writes were shielded only
  // because every rule is `.write: false`; server writes use the Admin SDK and
  // bypass rules entirely — so `npm run dev` wrote to PRODUCTION. A local bid
  // overwrote the prod `auction-bids` node that live auction pages subscribe to,
  // and a local message send wrote prod `chats/**`.
  //
  // `FIREBASE_DATABASE_EMULATOR_HOST` is the standard variable the Firebase CLI
  // exports for exactly this, so honouring it costs one branch and makes
  // `firebase emulators:start` do what everyone already assumed it did.
  const emulatorHost = process.env.FIREBASE_DATABASE_EMULATOR_HOST?.trim();
  if (emulatorHost) {
    const ns =
      process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
      "default";
    return `http://${emulatorHost}?ns=${ns}`;
  }

  return (
    process.env.FIREBASE_ADMIN_DATABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL?.trim() ||
    undefined
  );
}
