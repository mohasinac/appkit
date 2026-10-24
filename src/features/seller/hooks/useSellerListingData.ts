"use client";

/**
 * Row-shaping helpers for the seller listing views.
 *
 * The `useSellerListingData` hook that used to live here was deleted: it was
 * a second listing-fetch engine beside `DataListingView`/`useAdminListing`,
 * with its own q/sorts/filters handling, and it had ZERO call sites. Two
 * engines for one job is what this whole investigation was about — the dead
 * one is what the next session copies from.
 *
 * The four helpers below are NOT dead: six seller views import them.
 */

import type { JsonValue } from "@mohasinac/appkit/client";
import { formatCurrency } from "../../../utils/number.formatter";
// The defining module, not a barrel (Root Cause #18). `hasEncPrefix` is a pure
// string test with no crypto in its import chain, so it is client-safe.
import { hasEncPrefix } from "../../../security/pii-mask";

type UnknownRecord = Record<string, JsonValue>;

export function toRecordArray(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? (value.filter(Boolean) as UnknownRecord[]) : [];
}

export function toStringValue(value: unknown, fallback = "-"): string {
  if (typeof value === "string") {
    /*
     * 🛑 Ciphertext is not a display value, and this is the last line of
     * defence rather than the fix.
     *
     * `OrderRepository.mapDoc` deliberately does not decrypt, so any route
     * that forgets `revealOrders`/`maskedOrders` hands this function a stored
     * `enc:v1:…` blob — and it is a `string`, so it rendered verbatim.
     * Measured live in the seller's order list, where the row subtitle read
     * `enc:v1:8plr3ZzKBqejPPti:MCZsrfOidLkSL6EogbxlCzU=:…` where the buyer's
     * name belongs.
     *
     * This is a RECURRING class, not one slip: eight separate files in appkit
     * carry a comment recording the same leak, and one of them had already
     * baked `enc:v1:…` into 383 notification bodies. The route fix is the real
     * repair; this makes the NEXT one degrade to "-" instead of garbage.
     *
     * `hasEncPrefix` rather than `isPiiEncrypted`: its own docstring says this
     * is the check the display masks want, because a settings-encrypted or
     * malformed envelope is exactly as unshowable as a PII one.
     */
    if (hasEncPrefix(value)) return fallback;
    return value.trim() || fallback;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

export function toCurrency(value: unknown): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return formatCurrency(value);
}

/*
 * 🛑 `toRelativeDate` WAS HERE AND IS GONE. Import it from
 * `features/admin/hooks/useAdminListingData` — the defining module now, and
 * the one 44 files already use (Root Cause #18: import from where a symbol is
 * defined, never from a convenience copy).
 *
 * This copy had drifted from that one and the drift was live: for a FUTURE
 * date, `deltaMs` is negative, so `deltaMs < minute` matched and this version
 * answered **"just now"** while the admin version answered **"1m ago"** — two
 * different wrong answers to "when is this deadline", depending on which file
 * a view happened to import from. The admin one is fixed to say "in 48h"; a
 * second implementation is how that fix would have been half-applied.
 *
 * The three sibling helpers below are also duplicated there. They are left
 * alone deliberately: none of them is wrong, and collapsing them is an import
 * rewrite across both feature trees rather than a bug fix.
 */

