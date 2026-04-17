import "server-only";

// appkit/src/seed/runner.ts
// Server-only — requires firebase-admin
import type { SeedConfig, SeedResult } from "./types";
import { encryptPiiFields } from "../security/pii-encrypt";

const BATCH_SIZE = 400; // Firestore max batch is 500

export async function runSeed(config: SeedConfig): Promise<SeedResult> {
  const { getFirestore } = await import("firebase-admin/firestore");
  const db = config.projectId ? getFirestore(config.projectId) : getFirestore();
  const start = Date.now();
  let totalDocuments = 0;

  for (const collection of config.collections) {
    const {
      collection: name,
      data,
      idField = "id",
      merge = false,
      piiFields = [],
    } = collection;

    config.onProgress?.(name, 0, data.length);
    let written = 0;

    while (written < data.length) {
      const slice = data.slice(written, written + BATCH_SIZE);
      if (!config.dryRun) {
        const batch = db.batch();
        for (const rawDoc of slice) {
          const doc = piiFields.length
            ? encryptPiiFields(
                rawDoc as Record<string, unknown>,
                piiFields as string[],
              )
            : (rawDoc as Record<string, unknown>);
          const id = String(
            (rawDoc as Record<string, unknown>)[idField] ??
              `auto-${written + slice.indexOf(rawDoc)}`,
          );
          const ref = db.collection(name).doc(id);
          batch.set(ref, doc, { merge });
        }
        await batch.commit();
      }
      written += slice.length;
      totalDocuments += slice.length;
      config.onProgress?.(name, written, data.length);
    }
  }

  return {
    collections: config.collections.map((c) => c.collection),
    totalDocuments,
    durationMs: Date.now() - start,
  };
}
