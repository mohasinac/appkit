/*
 * WHY: A group's rules and its discount are seller-editable, and a cart can sit
 *      for days. `addGroupLineToCart` checked both at add time and nothing
 *      re-checked them — so a rule tightened afterwards was never applied, and
 *      a line kept quoting a discount percentage the seller had since changed.
 * WHAT: The third enforcement point — re-validate every multi-member line
 *       against its group's CURRENT rules, immediately before pricing.
 *
 * 🛑 IT REPORTS, IT DOES NOT SILENTLY RESOLVE. A changed discount is the
 * delicate case and it has two wrong answers: honouring the stale percent
 * charges less than the seller now offers, and re-deriving silently changes a
 * total the buyer has already read and agreed to. So the line is repriced to
 * the current rule AND the change is handed back to the caller to surface —
 * exactly what `revalidateAppliedCoupons` does with a lapsed coupon, for the
 * same reason: the buyer is on the payment step and cannot fix a seller's rule
 * change from there, so failing the whole checkout is hostile.
 *
 * 🛑 A rule VIOLATION is different from a repriced discount and is treated
 * differently. "This group now requires item X" cannot be fixed by adjusting a
 * number — the selection itself is no longer valid — so that line is reported
 * as blocked rather than quietly bought.
 *
 * EXPORTS: GroupLineRepriced, GroupLineBlocked, GroupRuleRevalidation,
 *          revalidateGroupLines
 *
 * @tag domain:checkout
 * @tag layer:server
 * @tag pattern:none
 * @tag access:server
 * @tag consumers:checkout/actions
 * @tag sideEffects:firestore
 */

import { safeRead } from "../../../../errors/safe-read";
import { serverLogger } from "../../../../monitoring/server-logger";
import { productRepository } from "../../../../repositories";
import { groupedListingsRepository } from "../../../../features/grouped/repository/grouped-listings.repository";
import type { CartItemDocument } from "../../../../features/cart/schemas/firestore";
import {
  checkGroupRules,
  readGroupRules,
  type GroupRules,
} from "../../../shared/features/products/group-rules";
import { isMultiMemberLine } from "../../../shared/checkout/line-members";

export interface GroupLineRepriced {
  itemId: string;
  groupTitle: string;
  /** What the line was quoted at. */
  previousPercent: number;
  /** What the group's rule says now. */
  currentPercent: number;
}

export interface GroupLineBlocked {
  itemId: string;
  groupTitle: string;
  /** Buyer-facing, from `checkGroupRules`. */
  reason: string;
}

export interface GroupRuleRevalidation {
  repriced: GroupLineRepriced[];
  blocked: GroupLineBlocked[];
}

/** One group's rules, from whichever of the two homes owns them. */
async function rulesFor(item: CartItemDocument): Promise<GroupRules | null> {
  const groupId = item.groupId;
  if (!groupId) return null;

  if (item.groupSource === "grouped-listing") {
    const doc = await safeRead(() => groupedListingsRepository.findById(groupId), {
      route: "/checkout",
      key: "groupedListings.rules",
      fallback: null,
    });
    return doc ? readGroupRules(doc) : null;
  }

  /*
   * A product group's rules live on the PARENT product, and `groupId` IS the
   * parent's slug (`startGroup` sets `groupId = slug`, and products are pure
   * slugs), so this resolves directly.
   */
  const parent = await safeRead(() => productRepository.findById(groupId), {
    route: "/checkout",
    key: "products.groupParentRules",
    fallback: null,
  });
  return parent ? readGroupRules(parent) : null;
}

/**
 * Re-validate every multi-member line in the checkout batch.
 *
 * 🛑 A null `rules` — the group is gone, or the read failed — is treated as
 * UNRESTRICTED and the line is left exactly as it is. Failing open is right in
 * both cases: a transient Firestore error must not block a payment, and a
 * deleted group is not a reason to refuse a selection the buyer already made
 * and already had priced.
 *
 * 🛑 Bundle lines are deliberately skipped. A bundle is all-or-nothing with its
 * own locked price — `unitPriceFor`'s bundle branch runs BEFORE its members
 * branch precisely so the discount that IS the bundle is not recomputed from
 * list prices — so self-assembly rules have nothing to say about one.
 */
export async function revalidateGroupLines(
  items: readonly CartItemDocument[],
): Promise<GroupRuleRevalidation> {
  const repriced: GroupLineRepriced[] = [];
  const blocked: GroupLineBlocked[] = [];

  const lines = items.filter(
    (i) => isMultiMemberLine(i) && !i.bundleCategorySlug && i.lineKind === "group",
  );
  if (lines.length === 0) return { repriced, blocked };

  for (const item of lines) {
    const rules = await rulesFor(item);
    if (!rules) continue;

    const members = item.groupMembers ?? [];
    const violations = checkGroupRules(
      rules,
      members.map((m) => ({
        productId: m.productId,
        quantity: m.quantity,
        title: m.title,
      })),
    );
    if (violations.length > 0) {
      blocked.push({
        itemId: item.itemId,
        groupTitle: item.groupTitle ?? item.productTitle,
        reason: violations[0].message,
      });
      /*
       * Reported and NOT repriced. A blocked line's price is irrelevant — the
       * caller is about to refuse it — and repricing it first would leave a
       * stored price for a line that never sold.
       */
      continue;
    }

    const quoted = item.groupDiscountPercent ?? 0;
    const current = Math.min(100, Math.max(0, rules.groupDiscountPercent ?? 0));
    if (quoted !== current) {
      repriced.push({
        itemId: item.itemId,
        groupTitle: item.groupTitle ?? item.productTitle,
        previousPercent: quoted,
        currentPercent: current,
      });
      serverLogger.info("checkout: group discount changed since add-to-cart", {
        itemId: item.itemId,
        quoted,
        current,
      });
    }
  }

  return { repriced, blocked };
}
