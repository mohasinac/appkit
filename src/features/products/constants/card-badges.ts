/**
 * What a product card may say in its badge corner, and in what order.
 *
 * ── THE DEFECT THIS REPLACES ────────────────────────────────────────────────
 *
 * `ProductCard` rendered SEVEN independent badges into one absolutely-
 * positioned stack, each unconditionally shown when its own condition held:
 *
 *   -20%  ·  Auction  ·  Bundled  ·  In Set  ·  Taking Offers  ·  Final Sale
 *   ·  Has Variants
 *
 * None of them knew about the others. A discounted auction that is a bundled
 * set member with offers enabled, final sale and variants renders all seven,
 * stacked top-left, covering the product photograph the card exists to show.
 * Nothing is wrong with any one of those badges; the defect is that nobody
 * decided which matters.
 *
 * ── THE RULE ────────────────────────────────────────────────────────────────
 *
 * 🛑 A BADGE EARNS ITS PLACE BY CHANGING WHETHER THE SHOPPER CLICKS. That is
 * the whole test, and it sorts the seven cleanly:
 *
 *   KEEPS ITS PLACE — changes the decision to click
 *     · listing TYPE: an auction and a pre-order are different transactions
 *       with different CTAs. Not knowing is a wasted click.
 *     · DISCOUNT: the single commercial reason to look at this card first.
 *
 *   LOSES ITS PLACE — matters when deciding to BUY, not to click
 *     · Final Sale, Taking Offers, Bundled, In Set, Has Variants
 *
 * The second group is not deleted — it moves to the detail page, where there
 * is room to state it in words rather than a 10px pill. A badge a shopper
 * cannot act on from a grid is noise, and noise hides the badge they can act
 * on, which is the actual cost of having seven.
 *
 * 🛑 `MAX_CARD_BADGES = 2` IS THE MECHANISM, and it has to exist separately
 * from the precedence list. A precedence with no cap is still seven badges in
 * a known order; the cap is what makes adding an eighth a design decision
 * instead of a silent append. An overflow count ("+3") was considered and
 * rejected — it is itself a badge, and one that says nothing.
 *
 * ── WHY A MODULE AND NOT A `.slice(0, 2)` AT THE CALL SITE ─────────────────
 *
 * Three card components render these (`ProductCard`, its list layout, and the
 * per-type marketplace cards), and a cap applied at one of them is the shape
 * this codebase has paid for repeatedly: `unitPriceFor` documented itself as
 * "the single source of truth" and was then hand-copied into four more places,
 * one of which never learned about locked prices and charged the list price
 * for a negotiated sale (Root Cause #75).
 *
 * @tag domain:products
 * @tag layer:shared
 * @tag access:isomorphic
 */

/** Stable ids, so a consumer can reason about precedence without string-matching. */
export const CARD_BADGE = {
  DISCOUNT: "discount",
  LISTING_TYPE: "listing-type",
} as const;

export type CardBadgeId = (typeof CARD_BADGE)[keyof typeof CARD_BADGE];

export interface CardBadge {
  id: CardBadgeId;
  label: string;
  /** Resolved by the caller from the listing-type plugin, or a local constant. */
  className: string;
  /** Long form, for the `title` attribute. */
  title?: string;
}

/**
 * 🛑 THE CAP. Two is not a round number — it is one commercial signal
 * (discount) plus one transactional one (type), which are the only two
 * questions a shopper answers before clicking. A third badge would have to
 * displace one of those to earn its place.
 */
export const MAX_CARD_BADGES = 2;

/**
 * Precedence, highest first.
 *
 * 🛑 DISCOUNT OUTRANKS TYPE, deliberately, and this is the one judgement call
 * in the file. Type is what the card IS; discount is why this card rather than
 * the one beside it. In a grid the shopper is comparing, so the comparative
 * signal goes first — and at the cap of two both are shown anyway, so the
 * order only decides which is read first.
 */
export const CARD_BADGE_PRECEDENCE: readonly CardBadgeId[] = [
  CARD_BADGE.DISCOUNT,
  CARD_BADGE.LISTING_TYPE,
];

/**
 * Sort candidates by precedence and cap them.
 *
 * Takes already-resolved badges rather than a product, so this module needs no
 * import of the listing-type registry or the product schema — it stays a pure
 * ordering decision, which is the only thing it should be opinionated about.
 *
 * An id absent from `CARD_BADGE_PRECEDENCE` sorts LAST rather than being
 * dropped: silently discarding a badge a caller built would be the harder
 * failure to find, and the cap removes it anyway if it does not fit.
 */
export function resolveCardBadges(
  candidates: readonly (CardBadge | null | undefined)[],
): CardBadge[] {
  const rank = (id: CardBadgeId) => {
    const i = CARD_BADGE_PRECEDENCE.indexOf(id);
    return i === -1 ? CARD_BADGE_PRECEDENCE.length : i;
  };
  return candidates
    .filter((b): b is CardBadge => b != null)
    .sort((a, b) => rank(a.id) - rank(b.id))
    .slice(0, MAX_CARD_BADGES);
}
