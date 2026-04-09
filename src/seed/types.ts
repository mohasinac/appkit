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
}

export interface SeedConfig {
  /** Collections to seed in order */
  collections: SeedCollection[];
  /** Firestore project ID — defaults to process.env.FIREBASE_PROJECT_ID */
  projectId?: string;
  /** Write nothing; only log what would be written */
  dryRun?: boolean;
  /** Called after each successful batch write */
  onProgress?: (
    collectionName: string,
    written: number,
    total: number,
  ) => void;
}

export interface SeedResult {
  collections: string[];
  totalDocuments: number;
  durationMs: number;
}
