// appkit/src/seed/runner.ts
// Server-only — requires firebase-admin
import type {
  SeedConfig,
  SeedResult,
  SeedDryRunDiff,
  SeedValidationError,
} from "./types";
import { SeedAbortedError } from "./types";
import { encryptPiiFields } from "../security/pii-encrypt";
import type { FirestoreDocument } from "../schemas/types";

const BATCH_SIZE = 400; // Firestore max batch is 500
const DEFAULT_MAX_ATTEMPTS = 2;

/**
 * P31-D: heuristic for retryable Firestore errors. firebase-admin doesn't
 * surface a canonical "retryable" flag — we match the error message against
 * known-transient patterns (DEADLINE_EXCEEDED, UNAVAILABLE, network resets).
 */
// audit-unknown-ok: type-narrowing entry point — accepts any value, narrows by typeof/Array.isArray
function isRetryableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("DEADLINE_EXCEEDED") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.toLowerCase().includes("retry")
  );
}

export async function runSeed(config: SeedConfig): Promise<SeedResult> {
  const { getApp, getApps, initializeApp } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  const app = config.projectId
    ? (() => {
        const appName = `seed-${config.projectId}`;
        return getApps().some((candidate) => candidate.name === appName)
          ? getApp(appName)
          : initializeApp({ projectId: config.projectId }, appName);
      })()
    : getApps()[0];
  const db = app ? getFirestore(app) : getFirestore();
  const start = Date.now();
  const maxAttempts = config.maxBatchAttempts ?? DEFAULT_MAX_ATTEMPTS;
  let totalDocuments = 0;
  let retriedBatches = 0;
  const validationErrors: SeedValidationError[] = [];
  const dryRunDiff: SeedDryRunDiff[] = [];

  for (const collection of config.collections) {
    const {
      collection: name,
      data,
      idField = "id",
      merge = false,
      piiFields = [],
      validate,
    } = collection;

    // P31-A: per-doc validation gate. Invalid docs are pulled out of the
    // write set before we touch Firestore. Strict mode aborts on first error.
    const validDocs: unknown[] = [];
    const skipped: string[] = [];
    for (const rawDoc of data) {
      const record = rawDoc as FirestoreDocument;
      const docId = String(record[idField] ?? `auto-${data.indexOf(rawDoc)}`);
      if (validate) {
        const errors = validate(rawDoc);
        if (errors.length > 0) {
          validationErrors.push({ collection: name, docId, errors });
          config.onValidationError?.(name, docId, errors);
          if (config.strictValidation) {
            throw new SeedAbortedError(name, docId, errors);
          }
          skipped.push(docId);
          continue;
        }
      }
      validDocs.push(rawDoc);
    }

    config.onProgress?.(name, 0, validDocs.length);

    // P31-C: dry-run diff. Fetch existing docs in chunks of 30 (Firestore's
    // `getAll` limit per RPC) and bucket each into create vs update.
    if (config.dryRun) {
      const toCreate: string[] = [];
      const toUpdate: string[] = [];
      const ids = validDocs.map((doc, i) =>
        String(
          (doc as FirestoreDocument)[idField] ?? `auto-${i}`,
        ),
      );
      const GETALL_CHUNK = 30;
      for (let i = 0; i < ids.length; i += GETALL_CHUNK) {
        const chunk = ids.slice(i, i + GETALL_CHUNK);
        const refs = chunk.map((id) => db.collection(name).doc(id));
        const snaps = await db.getAll(...refs);
        snaps.forEach((snap, j) => {
          if (snap.exists) toUpdate.push(chunk[j]);
          else toCreate.push(chunk[j]);
        });
      }
      dryRunDiff.push({ collection: name, toCreate, toUpdate, toSkip: skipped });
      totalDocuments += validDocs.length;
      config.onProgress?.(name, validDocs.length, validDocs.length);
      continue;
    }

    let written = 0;
    while (written < validDocs.length) {
      const slice = validDocs.slice(written, written + BATCH_SIZE);
      const batch = db.batch();
      for (const rawDoc of slice) {
        const doc = piiFields.length
          ? encryptPiiFields(
              rawDoc as FirestoreDocument,
              piiFields as string[],
            )
          : (rawDoc as FirestoreDocument);
        const id = String(
          (rawDoc as FirestoreDocument)[idField] ??
            `auto-${written + slice.indexOf(rawDoc)}`,
        );
        const ref = db.collection(name).doc(id);
        batch.set(ref, doc, { merge });
      }
      // P31-D: bounded retry on transient errors. We don't loop forever — a
      // genuinely broken collection should fail fast rather than thrash.
      let attempt = 0;
      while (true) {
        attempt += 1;
        try {
          await batch.commit();
          if (attempt > 1) retriedBatches += 1;
          break;
        } catch (err) {
          if (attempt >= maxAttempts || !isRetryableError(err)) throw err;
        }
      }
      written += slice.length;
      totalDocuments += slice.length;
      config.onProgress?.(name, written, validDocs.length);
    }
  }

  return {
    collections: config.collections.map((c) => c.collection),
    totalDocuments,
    durationMs: Date.now() - start,
    validationErrors,
    retriedBatches,
    ...(config.dryRun ? { dryRunDiff } : {}),
  };
}
