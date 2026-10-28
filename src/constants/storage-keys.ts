/**
 * Browser-storage and postMessage keys — one namespace, configurable.
 *
 * ## Why this exists
 *
 * Seven call sites hardcoded a `letitrip`-prefixed key:
 *
 *   localStorage  "letitrip:section-state" · "letitrip:last-category"
 *                 "letitrip:announcement-dismissed" · "letitrip_oauth_redirect"
 *                 "letitrip_search_type"
 *   postMessage   "letitrip_auth_close"
 *
 * For the app that shipped them that is harmless. For a LIBRARY it is not:
 * every consumer inherits one marketplace's namespace, two appkit apps on the
 * same origin collide, and the brand is baked into data the user's browser
 * keeps. Tier AK's whole premise is that appkit should not know whose app it
 * is in.
 *
 * ## 🛑 The prefix is read at CALL TIME, not at module load
 *
 * `storageKey()` is a function and the keys below are getters. A consumer sets
 * the namespace from its own bootstrap, which runs after this module is
 * evaluated — so a `const KEY = PREFIX + ":x"` captured at import time would
 * freeze the default and silently ignore the configuration. That is the same
 * trap as a mirror field (Root Cause #42): two things that must agree, where
 * only one is ever written.
 *
 * ## 🛑 Changing the namespace ORPHANS existing values
 *
 * These keys are how a returning visitor's dismissed banner and collapsed
 * sections are remembered. Renaming the prefix does not migrate them — the old
 * entries simply stop being read. That is acceptable for UI state and would NOT
 * be for anything load-bearing, which is why nothing load-bearing belongs here:
 * the auth session is an HTTP-only cookie, not a storage key.
 *
 * ## The separator is deliberately NOT normalised
 *
 * Five keys use `:` and three use `_`. They are kept exactly as they were,
 * because normalising them is a silent data migration for every existing
 * visitor in exchange for tidiness. New keys should use `:`.
 */

/**
 * Default namespace.
 *
 * Deliberately NOT "letitrip" — a library's default must not name one
 * consumer. `"appkit"` is what an unconfigured install gets, which is both
 * neutral and obviously-a-default when seen in devtools.
 */
const DEFAULT_STORAGE_NAMESPACE = "appkit";

let namespace = DEFAULT_STORAGE_NAMESPACE;

/**
 * Set the prefix every appkit storage key carries. Call once, from the
 * consumer's client bootstrap, before any UI mounts.
 *
 * Idempotent and last-call-wins; there is no unset, because a namespace that
 * changes mid-session would strand whatever was written under the previous one.
 */
export function setStorageNamespace(value: string): void {
  const trimmed = value.trim();
  if (trimmed) namespace = trimmed;
}

/** The active namespace. Exported for diagnostics, not for building keys. */
export function getStorageNamespace(): string {
  return namespace;
}

/**
 * Build a namespaced key.
 *
 * @param suffix the part after the separator, e.g. `"last-category"`
 * @param separator `":"` for new keys; `"_"` only where an existing key used it
 */
export function storageKey(suffix: string, separator: ":" | "_" = ":"): string {
  return `${namespace}${separator}${suffix}`;
}

/**
 * The keys appkit itself owns.
 *
 * Getters, not constants — see the call-time note above. Each records the
 * literal it replaced so the migration is auditable and a reader can tell at a
 * glance which separator is historical rather than chosen.
 */
export const STORAGE_KEYS = {
  /** Collapsed account-page sections. Was `"letitrip:section-state"`. */
  get sectionState() {
    return storageKey("section-state");
  },
  /** Last category visited, for the contextual trail. Was `"letitrip:last-category"`. */
  get lastCategory() {
    return storageKey("last-category");
  },
  /** Announcement bar dismissal. Was `"letitrip:announcement-dismissed"`. */
  get announcementDismissed() {
    return storageKey("announcement-dismissed");
  },
  /** OAuth return URL across the popup round-trip. Was `"letitrip_oauth_redirect"`. */
  get oauthRedirect() {
    return storageKey("oauth_redirect", "_");
  },
  /** Remembered search-type tab. Was `"letitrip_search_type"`. */
  get searchType() {
    return storageKey("search_type", "_");
  },
} as const;

/**
 * postMessage `type` values.
 *
 * 🛑 Namespaced for the same reason, and with a sharper edge: a `message`
 * listener receives events from ANY window that can reach it, so an
 * unnamespaced type is both a collision and an input-validation question. The
 * listeners that read this must keep checking `event.origin` regardless — a
 * namespace is not an authentication mechanism.
 */
export const MESSAGE_TYPES = {
  /** Auth popup signalling it is done. Was `"letitrip_auth_close"`. */
  get authClose() {
    return storageKey("auth_close", "_");
  },
} as const;
