import { isIconKey, type IconKey } from "../../../ui/icons/icon-registry";

/**
 * Stored icon strings → `IconKey`s, for the trust / security / stats tiles.
 *
 * ## 🛑 Why an alias map and not a retype
 *
 * `TrustIndicator.icon` is a `string` and live documents hold TWO unrelated
 * spellings of it:
 *
 *   - kebab lucide names, from the seed — `"shield-check"`, `"rotate-ccw"`,
 *     `"message-circle"`;
 *   - intent slugs, from `section-defaults.ts` — `"secure-payments"`,
 *     `"fast-delivery"`, `"easy-returns"`, `"support"`.
 *
 * Neither set is a valid `IconKey` (the registry is intent-named: `verify`,
 * `restore`, `message`…), so retyping the field would invalidate every stored
 * document at once. Mapping instead means existing admin-authored values keep
 * working and the field stays editable.
 *
 * ## 🛑 Why the icon was invisible before this existed
 *
 * All three components declared `renderIcon?: (props) => ReactNode` and the
 * section renderer never passed it — a function prop has no representation in a
 * Firestore document, so it was unreachable by construction. The result was
 * four trust tiles rendering the same hardcoded `✓` while four *different*
 * promises sat beside them, and no icon at all on the stats and security
 * tiles. The admin editor round-tripped `icon` the whole time and the component
 * used it only as a React key. Root Cause #51.
 *
 * An unmapped value resolves to `undefined` and the tile renders text-only,
 * which is strictly better than one glyph standing in for everything.
 */
const TRUST_ICON_ALIASES: Record<string, IconKey> = {
  // Lucide kebab names, as written by the seed and the admin editor.
  "shield-check": "verify",
  lock: "lock",
  "rotate-ccw": "restore",
  "message-circle": "message",
  truck: "ship",
  star: "review",
  package: "order",
  "trending-up": "analytics",
  "help-circle": "help",
  tag: "deals",
  flag: "report",

  // Intent slugs, as written by DEFAULT_TRUST_FEATURES.
  "secure-payments": "lock",
  "fast-delivery": "ship",
  "easy-returns": "restore",
  support: "help",
  authenticity: "verify",

  // Intent slugs, as written by the `features` seed config.
  escrow: "lock",
  "verified-sellers": "verify",
  "scam-registry": "report",
  "encrypted-data": "lock",
  encryption: "lock",
  tls: "lock",
  rbac: "user",
  "min-priv": "settings",
};

/**
 * Resolve a stored icon string to a registry key.
 *
 * Accepts an already-valid `IconKey` unchanged, so a value authored after the
 * admin editor moved to a key picker needs no alias entry.
 */
export function resolveTrustIcon(stored: string | undefined | null): IconKey | undefined {
  if (!stored) return undefined;
  const aliased = TRUST_ICON_ALIASES[stored];
  if (aliased) return aliased;
  return isIconKey(stored) ? stored : undefined;
}
