/*
 * WHY: "Create your own bundle, with restrictions set by seller/admin" is the
 *      feature. The restrictions have TWO homes — a product group is identified
 *      by the parent product's slug, while a `groupedListing` is its own
 *      document — and the picker, the cart-add and the checkout re-validation
 *      all have to agree about them.
 * WHAT: One shape, one resolver, one enforcer. Three readers, zero copies.
 *
 * 🛑 THE SAME RULES, FROM EITHER HOME. Resolving them at each call site is how
 * a picker ends up permitting a selection the server then refuses (or worse,
 * the reverse — a server-only rule reads as a broken button). `resolveGroupRules`
 * is the only place the two homes are read, and `checkGroupRules` is the only
 * place they are applied.
 *
 * 🛑 EVERY FIELD IS OPTIONAL AND ABSENT MEANS UNRESTRICTED. Every group that
 * exists today has none of these, so a default that restricted anything would
 * silently change what is buyable on live records.
 *
 * EXPORTS: GroupRules, GroupRuleSource, GroupRuleViolation, EMPTY_GROUP_RULES,
 *          readGroupRules, checkGroupRules, describeGroupRules
 *
 * @tag domain:products
 * @tag layer:shared
 * @tag pattern:none
 * @tag access:isomorphic
 * @tag consumers:GroupMemberPicker,cart-actions,checkout
 * @tag sideEffects:none
 */

/**
 * What a seller or admin may constrain about a self-assembled selection.
 *
 * 🛑 These are limits on the SELECTION, never on stock. Stock is independent
 * per listing (there is no pool and no bill of materials) — a spare attack ring
 * is one object the seller happens to have. These answer "what counts as a
 * valid mix", which is a merchandising decision.
 */
export interface GroupRules {
  /** Fewest DISTINCT members a valid selection may contain. */
  groupMinMembers?: number;
  /** Most distinct members. */
  groupMaxMembers?: number;
  /** Ceiling on units of any ONE member, independent of the line total. */
  groupMaxUnitsPerMember?: number;
  /** Product ids that must be present for the selection to be valid. */
  groupRequiredMemberIds?: string[];
  /**
   * Percentage off the selection's subtotal, 0–100.
   *
   * 🛑 Carried here but NOT applied here, and that separation is deliberate.
   * The discount has to land inside the repository's private `deriveLinePrice`,
   * which runs on every `groupMembers` write and feeds
   * `expandCartLineToOrderRows`' per-member GST proration via
   * `allocateAcrossMembers`. Applying it in a second place is how the cart
   * total comes to disagree with the invoice (Root Cause #75), so this module
   * only ever REPORTS the figure.
   */
  groupDiscountPercent?: number;
}

export const EMPTY_GROUP_RULES: GroupRules = {};

/** Whichever document the rules were read off. */
export type GroupRuleSource = "product-group" | "grouped-listing";

/**
 * Read the rules off either home.
 *
 * Structurally typed on purpose: a product group's rules live on the PARENT
 * product document and a grouped listing's on its own, and both are just
 * objects carrying these optional keys. Taking `ProductDocument |
 * GroupedListingDocument` here would drag two feature schemas into a shared
 * module for no gain — and this module is imported by a client component.
 */
export function readGroupRules(doc: Partial<GroupRules> | null | undefined): GroupRules {
  if (!doc) return EMPTY_GROUP_RULES;
  const out: GroupRules = {};
  /*
   * Copied field by field rather than spread. A spread of the whole parent
   * PRODUCT document would carry ~90 unrelated fields into something named
   * "rules", and the next reader would reasonably assume everything on it was
   * a rule.
   */
  if (typeof doc.groupMinMembers === "number") out.groupMinMembers = doc.groupMinMembers;
  if (typeof doc.groupMaxMembers === "number") out.groupMaxMembers = doc.groupMaxMembers;
  if (typeof doc.groupMaxUnitsPerMember === "number") {
    out.groupMaxUnitsPerMember = doc.groupMaxUnitsPerMember;
  }
  if (Array.isArray(doc.groupRequiredMemberIds) && doc.groupRequiredMemberIds.length > 0) {
    out.groupRequiredMemberIds = [...doc.groupRequiredMemberIds];
  }
  if (typeof doc.groupDiscountPercent === "number") {
    out.groupDiscountPercent = doc.groupDiscountPercent;
  }
  return out;
}

export interface GroupRuleViolation {
  code:
    | "GROUP_TOO_FEW_MEMBERS"
    | "GROUP_TOO_MANY_MEMBERS"
    | "GROUP_MEMBER_QTY_EXCEEDED"
    | "GROUP_REQUIRED_MEMBER_MISSING";
  /** Buyer-facing, already specific. Never a raw field name. */
  message: string;
}

/** One chosen member: which product, and how many of it. */
export interface GroupSelectionEntry {
  productId: string;
  quantity: number;
  /** For the message. Falls back to the id when the caller has no title. */
  title?: string;
}

/**
 * Check a selection against the rules.
 *
 * Returns ALL violations rather than the first, because a picker shows them
 * together and fixing one at a time is a worse experience than seeing the set.
 * The server throws on the first; that is the caller's choice, not this
 * function's.
 *
 * Entries at quantity 0 are ignored — the picker's stepper has `min={0}` and
 * zero means "not chosen", so counting them would make an untouched member
 * count toward `groupMinMembers`.
 */
export function checkGroupRules(
  rules: GroupRules,
  selection: readonly GroupSelectionEntry[],
): GroupRuleViolation[] {
  const chosen = selection.filter((e) => e.quantity > 0);
  const out: GroupRuleViolation[] = [];

  if (rules.groupMinMembers !== undefined && chosen.length < rules.groupMinMembers) {
    out.push({
      code: "GROUP_TOO_FEW_MEMBERS",
      message: `Pick at least ${rules.groupMinMembers} different item${
        rules.groupMinMembers === 1 ? "" : "s"
      } from this group — you have ${chosen.length}.`,
    });
  }

  if (rules.groupMaxMembers !== undefined && chosen.length > rules.groupMaxMembers) {
    out.push({
      code: "GROUP_TOO_MANY_MEMBERS",
      message: `Pick at most ${rules.groupMaxMembers} different item${
        rules.groupMaxMembers === 1 ? "" : "s"
      } from this group — you have ${chosen.length}.`,
    });
  }

  if (rules.groupMaxUnitsPerMember !== undefined) {
    for (const entry of chosen) {
      if (entry.quantity > rules.groupMaxUnitsPerMember) {
        out.push({
          code: "GROUP_MEMBER_QTY_EXCEEDED",
          message: `At most ${rules.groupMaxUnitsPerMember} of "${
            entry.title ?? entry.productId
          }" per order.`,
        });
      }
    }
  }

  if (rules.groupRequiredMemberIds) {
    const present = new Set(chosen.map((e) => e.productId));
    const missing = rules.groupRequiredMemberIds.filter((id) => !present.has(id));
    if (missing.length > 0) {
      /*
       * Named by id when the caller has no title for it — which is the normal
       * case, because a REQUIRED member the buyer has not chosen is not in
       * their selection and so has no entry to read a title from. The picker
       * passes titles it already has; the server does not have them and says
       * so honestly rather than printing "undefined".
       */
      const titles = missing.map(
        (id) => selection.find((e) => e.productId === id)?.title ?? id,
      );
      out.push({
        code: "GROUP_REQUIRED_MEMBER_MISSING",
        message: `This group requires ${titles.join(", ")} to be included.`,
      });
    }
  }

  return out;
}

/**
 * The rules in words, for the picker's header.
 *
 * Returns an empty array when nothing is restricted, so the caller renders
 * nothing rather than an empty box saying "Rules:".
 */
export function describeGroupRules(rules: GroupRules): string[] {
  const out: string[] = [];
  if (rules.groupMinMembers !== undefined) {
    out.push(`Pick at least ${rules.groupMinMembers}`);
  }
  if (rules.groupMaxMembers !== undefined) {
    out.push(`Pick at most ${rules.groupMaxMembers}`);
  }
  if (rules.groupMaxUnitsPerMember !== undefined) {
    out.push(`Max ${rules.groupMaxUnitsPerMember} of each`);
  }
  if (rules.groupDiscountPercent !== undefined && rules.groupDiscountPercent > 0) {
    out.push(`${rules.groupDiscountPercent}% off the selection`);
  }
  return out;
}
