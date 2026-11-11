/**
 * Who may sell: the platform's own store, or anyone.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 *
 * Collecting a buyer's money for a THIRD PARTY's goods and settling it onward
 * is the definition of a Payment Aggregator under the RBI (Regulation of
 * Payment Aggregators) Directions 2025, para 4(i) — and operating an
 * unauthorised payment system is a criminal offence under PSS Act s.4/s.26,
 * not a product defect. Authorisation needs a company (para 5(c)) and ₹15
 * crore of net worth (para 6(a)), so for most installs the licence is not a
 * fallback that can be reached for later.
 *
 * Selling your OWN goods and collecting your OWN revenue is not aggregation.
 * So the lawful default is: one store sells, and that store is ours.
 *
 * ── Why a store id and not a role ─────────────────────────────────────────
 *
 * 🛑 The platform store is an ORDINARY seller account that happens to be named
 * in config. It pays the same fees, ranks the same way, and carries the same
 * dispute exposure as any other store. There is deliberately no
 * `isPlatformStore` flag and no privileged branch in the fee path: waiving our
 * own commission would make first-party margins read ~8% better than they are
 * and corrupt every stocking decision made against that comparison — quite
 * apart from being the conduct the CCI acted on against Amazon and Flipkart.
 *
 * ── Why absent means OFF ──────────────────────────────────────────────────
 *
 * 🛑 The opposite contract to every other flag in `siteSettings.listings`.
 * Those read "absent means enabled" because withholding a browse page is a
 * withdrawal of something that otherwise works. This one fails CLOSED: an
 * install that has never configured it must not be selling other people's
 * goods. Readers spell `=== true` rather than truthiness so a stray
 * `"false"` string from a hand-edited document cannot open the gate.
 *
 * ── What this does NOT do ─────────────────────────────────────────────────
 *
 * ⚠ It gates NEW listings, NEW checkouts and NEW payouts. It must never be
 * used to unwind work already in flight: an order placed while the gate was
 * open still delivers, still disputes, still refunds, and still settles what
 * it owes. Flipping a switch is not a reason for a buyer to lose a parcel or a
 * seller to lose money they have already earned.
 */

import { AuthorizationError } from "../../../errors";

/**
 * The slice of site settings this gate reads.
 *
 * Structurally typed rather than importing `SiteSettingsDocument`, for the
 * same reason `tiers.ts` takes a capability array: every call site already
 * holds the settings singleton, and depending on the admin feature's schema
 * from `_internal/shared` is the kind of cross-feature edge
 * `audit-import-cycles` watches for.
 */
export interface SellingGateSettings {
  listings?: {
    thirdPartySellingEnabled?: boolean;
    platformSellerStoreId?: string;
  };
}

export interface SellingGateContext {
  /**
   * ⚠ Does NOT bypass the gate, and that is the point.
   *
   * An admin acting on their own account cannot make third-party settlement
   * lawful — the constraint is on where the buyer's money goes, not on who
   * typed the form. Privilege is honoured everywhere else in this codebase
   * (`assertListingTypeAllowed` takes `isPrivileged`); here it deliberately is
   * not, so that an admin "just this once" cannot create the exposure.
   *
   * Kept on the context so a caller cannot quietly reintroduce a bypass by
   * passing one and assuming it worked — there is nowhere for it to go.
   */
  readonly _noPrivilegeBypass?: never;
}

/** Is third-party selling open platform-wide? */
export function isThirdPartySellingEnabled(settings: SellingGateSettings | undefined): boolean {
  return settings?.listings?.thirdPartySellingEnabled === true;
}

/** The store that may sell while third-party selling is off, if one is named. */
export function platformSellerStoreId(settings: SellingGateSettings | undefined): string | undefined {
  const id = settings?.listings?.platformSellerStoreId;
  return typeof id === "string" && id.trim() !== "" ? id : undefined;
}

/**
 * May this store sell?
 *
 * ⚠ `storeId` absent answers `false`, never `true`. A write path that has not
 * resolved a store yet has not earned a pass — the alternative is that a bug
 * which drops the store id opens the gate for everyone.
 */
export function isSellingAllowedFor(
  storeId: string | undefined | null,
  settings: SellingGateSettings | undefined,
): boolean {
  if (isThirdPartySellingEnabled(settings)) return true;
  if (typeof storeId !== "string" || storeId.trim() === "") return false;
  const platform = platformSellerStoreId(settings);
  // ⚠ Absent platform store while the gate is closed means NOBODY sells. A
  // misconfigured install sells nothing rather than selling everything.
  return platform !== undefined && platform === storeId;
}

/**
 * Why a refusal happened, in words an operator can act on.
 *
 * 🛑 Two distinct cases, kept distinct. "Not configured" is an admin's problem
 * and is fixed in one screen; "closed to third parties" is a deliberate state
 * and is fixed by a business decision. Collapsing them into one message sends
 * whoever reads it to the wrong place.
 */
export function sellingRefusalReason(
  storeId: string | undefined | null,
  settings: SellingGateSettings | undefined,
): string | null {
  if (isSellingAllowedFor(storeId, settings)) return null;
  if (platformSellerStoreId(settings) === undefined) {
    return (
      "Selling is not configured on this site. An administrator must nominate " +
      "the platform's own store before any listing can be sold."
    );
  }
  return (
    "This site is currently selling only its own stock. Listings from other " +
    "stores cannot be created or purchased while third-party selling is off."
  );
}

/**
 * Throwing form, for server-side write paths.
 *
 * ⚠ Throws `AuthorizationError`, which the route layer maps to 403 — not a
 * silent skip and not a 500. A payout that quietly no-ops is how money goes
 * missing; a refusal that names its cause is a state someone can resolve.
 */
export function assertSellingAllowed(
  storeId: string | undefined | null,
  settings: SellingGateSettings | undefined,
): void {
  const reason = sellingRefusalReason(storeId, settings);
  if (reason === null) return;
  throw new AuthorizationError(reason);
}

/**
 * Which of these stores may not sell — for refusing a MIXED CART in one pass.
 *
 * 🛑 Returns every offending store, not the first. A cart spanning three
 * blocked stores that reports only one sends the buyer round the loop three
 * times, removing an item each go.
 *
 * ⚠ Order-preserving and de-duplicated, so the message reads the way the cart
 * does.
 */
export function blockedSellingStoreIds(
  storeIds: readonly (string | undefined | null)[],
  settings: SellingGateSettings | undefined,
): string[] {
  if (isThirdPartySellingEnabled(settings)) return [];
  const seen = new Set<string>();
  const blocked: string[] = [];
  for (const id of storeIds) {
    const key = typeof id === "string" && id.trim() !== "" ? id : "";
    if (seen.has(key)) continue;
    seen.add(key);
    if (!isSellingAllowedFor(id, settings)) blocked.push(key);
  }
  return blocked;
}
