// appkit/src/seed/types.ts

export interface SeedCollection<T = unknown> {
  /** Firestore collection name */
  collection: string;
  /** Fixture records to write */
  data: T[];
  /** Field to use as the Firestore document ID (default: "id") */
  idField?: string;
  /** Use Firestore set({ merge: true }) — default: false (overwrite) */
  merge?: boolean;
  /**
   * Field names that contain PII.
   * These are AES-256-GCM encrypted before writing to Firestore.
   * A HMAC-SHA256 blind index is written to `<field>Index` alongside.
   * Requires `PII_ENCRYPTION_KEY` env var (32-byte hex).
   */
  piiFields?: string[];
  /**
   * Optional per-document validator (P31-A). Return an array of error messages
   * for invalid documents, or an empty array for valid ones. Caller is
   * responsible for plugging in the right Zod schema — keeps the runner free
   * of feature-specific imports. Errors flow into `SeedResult.validationErrors`
   * and are not written. If `SeedConfig.strictValidation` is true, the very
   * first validation failure aborts the run.
   */
  validate?: (doc: T) => string[];
}

export interface SeedConfig {
  /** Collections to seed in order */
  collections: SeedCollection[];
  /** Firestore project ID — defaults to process.env.FIREBASE_PROJECT_ID */
  projectId?: string;
  /** Write nothing; compute and return `dryRunDiff` instead. */
  dryRun?: boolean;
  /**
   * P31-A: when true, the first validation failure aborts the entire run with
   * `SeedAbortedError`. Used by CI gating. When false (default), invalid docs
   * are skipped and surfaced in `SeedResult.validationErrors`.
   */
  strictValidation?: boolean;
  /**
   * P31-D: max attempts per Firestore batch commit (1 = no retry). Default 2.
   * Retried only on transient network/availability errors (caught by message
   * heuristic — Firestore exposes no canonical retryable flag from the SDK).
   */
  maxBatchAttempts?: number;
  /** Called after each successful batch write */
  onProgress?: (
    collectionName: string,
    written: number,
    total: number,
  ) => void;
  /**
   * P31-A: called when a document fails validation. Receives the failing
   * collection, document id, and the error messages. Optional — for telemetry.
   */
  onValidationError?: (
    collectionName: string,
    docId: string,
    errors: string[],
  ) => void;
}

/** Per-collection diff returned when `dryRun=true` (P31-C). */
export interface SeedDryRunDiff {
  collection: string;
  toCreate: string[];
  toUpdate: string[];
  /** Skipped due to validation failure (only present when validator runs). */
  toSkip: string[];
}

/** Per-document validation failure surfaced after the run (P31-A). */
export interface SeedValidationError {
  collection: string;
  docId: string;
  errors: string[];
}

export interface SeedResult {
  collections: string[];
  totalDocuments: number;
  durationMs: number;
  /** Populated only when `dryRun=true` (P31-C). */
  dryRunDiff?: SeedDryRunDiff[];
  /** Always populated (empty array on a clean run) (P31-A). */
  validationErrors: SeedValidationError[];
  /** P31-D: batch commits that succeeded only after a retry. */
  retriedBatches: number;
}

/**
 * Thrown when `strictValidation=true` and a document fails validation. The
 * runner surfaces the failing document via `.cause`-style fields so CI can
 * report which collection/doc triggered the abort.
 */
export class SeedAbortedError extends Error {
  readonly collection: string;
  readonly docId: string;
  readonly errors: string[];
  constructor(collection: string, docId: string, errors: string[]) {
    super(
      `Seed aborted: ${collection}/${docId} failed validation — ${errors.join("; ")}`,
    );
    this.name = "SeedAbortedError";
    this.collection = collection;
    this.docId = docId;
    this.errors = errors;
  }
}
