/**
 * Source-agnostic field operation sentinels.
 *
 * Feature repositories use these helpers instead of importing
 * `FieldValue` from `firebase-admin/firestore` directly.
 * The active DB provider registers its concrete implementations
 * at startup via `registerFieldOps()`.
 */

// --- Sentinel type ---------------------------------------------------------
/**
 * Opaque sentinel value returned by field operation helpers.
 * Each DB provider wraps its native sentinel (e.g. `FieldValue`) in this type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FieldSentinel = any;

// --- Operation interface ---------------------------------------------------
export interface IFieldOps {
  /** Server-managed timestamp */
  serverTimestamp(): FieldSentinel;
  /** Atomic numeric increment */
  increment(n: number): FieldSentinel;
  /** Atomic array union (add elements if not present) */
  arrayUnion(...elements: unknown[]): FieldSentinel;
  /** Atomic array remove */
  arrayRemove(...elements: unknown[]): FieldSentinel;
  /** Delete a field */
  deleteField(): FieldSentinel;
}

// --- Runtime registry ------------------------------------------------------
let _ops: IFieldOps | null = null;

export function registerFieldOps(ops: IFieldOps): void {
  _ops = ops;
}

function getOps(): IFieldOps {
  if (!_ops) {
    throw new Error(
      "Field operations not registered. Call registerFieldOps() in providers.config.ts before using repositories.",
    );
  }
  return _ops;
}

// --- Public helpers (used by feature repositories) -------------------------
export function serverTimestamp(): FieldSentinel {
  return getOps().serverTimestamp();
}

export function increment(n: number): FieldSentinel {
  return getOps().increment(n);
}

export function arrayUnion(...elements: unknown[]): FieldSentinel {
  return getOps().arrayUnion(...elements);
}

export function arrayRemove(...elements: unknown[]): FieldSentinel {
  return getOps().arrayRemove(...elements);
}

export function deleteField(): FieldSentinel {
  return getOps().deleteField();
}
