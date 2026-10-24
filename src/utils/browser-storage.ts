/**
 * Guest-state storage access.
 *
 * The guest cart, guest wishlist and guest history each carried a byte-identical private
 * copy of this before 2026-10-24. All three are `"use client"` modules that are nonetheless
 * imported into module graphs the server renders, which is why the `typeof window` guard is
 * the entire point: reading `window.localStorage` during SSR throws, and the three features
 * that need it are the three a signed-out visitor touches on first paint.
 *
 * Returns `null` rather than throwing or returning a stub — a caller must decide what "no
 * storage" means for it, and a silent no-op stub would make a failed write indistinguishable
 * from a successful one (Root Cause #59).
 */
export function getDefaultStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}
