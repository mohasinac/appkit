// appkit/src/seed/types.ts

export interface SeedCollection<T = unknown> {
  /** Firestore collection name */
  collection: string;
  /** Fixture records to write */
  data: T[];
  /** Field to use as the Firestore document ID (default: "id") */
  idField?: keyof T & string;
  /** Use Firestore set({ merge: true }) — default: false (overwrite) */
  merge?: boolean;
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
