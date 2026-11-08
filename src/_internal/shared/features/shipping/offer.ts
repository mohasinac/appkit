/**
 * THE SELLER'S SHIPPING OFFER, THE BUYER'S CHOICE, AND THE SERVER'S AUTHORITY.
 *
 * Pure and synchronous — no I/O, no Firestore, no provider. One module decides
 * what a seller offers, what the buyer may pick, and what the buyer is charged,
 * so the picker, the preview, the capture and the order record cannot disagree
 * (Root Cause #75: a money rule reachable by copy-paste WILL be copied, and the
 * copy never learns about the branch added later).
 *
 * ## Owner, 2026-11-08 — the spec this file implements, verbatim
 *
 * *"A seller agrees from their dashboard for the shipping option. If they
 * select custom — i.e. their own — then they must set a per-order fee. But if
 * they are okay with our shipping providers' quotes then they must accept that
 * as well. Both can be enabled. When the buyer shops, at checkout they can
 * select the custom shipping (say ₹200 set by the seller) or check the quote
 * from the shipment integrations; if they find the other cheap they can choose
 * whatever they wish. But if they have selected that, then it is up to the
 * seller to fulfil as is — they cannot use the platform to ship for the other,
 * as we have already taken money from the customer. If however they need to
 * override it, they can refund the excess if any; and in case they needed to
 * pay more for their custom shipping than what the buyer paid, they have to
 * swallow that money as a loss."*
 *
 * ## 🛑 THE DEFECT THIS FILE EXISTS TO CLOSE
 *
 * Measured live 2026-11-08 on a ₹149 item at `checkout/actions.ts:1595`:
 *
 * ```
 * shippingFee = roundShippingUp(selectedShippingQuote.chargedRate)
 * ```
 *
 * honest request → charged total **₹172.69**
 * forged `{ chargedRate: 1 }` → charged total **₹222.69**
 *
 * A number the CLIENT posted reached the charged total. The server's own
 * `resolveShippingCost` result was computed and then discarded. The old comment
 * argued the trust was "bounded" because `roundShippingUp` re-rounds it — but
 * re-rounding a forged number only guarantees the forgery lands on a ₹50 step.
 * ₹1 rounds to ₹50 and ₹10,000 rounds to ₹10,000; the bound is the attacker's
 * choice, not ours. Undercutting was not exploitable only because no seeded
 * store had `shippingPricing` configured, so every resolved fee was ₹0 — i.e.
 * the protection was a data accident, due to expire the moment a vendor set a
 * real rate.
 *
 * ## 🛑 Why the fix is NOT "forbid a client-supplied shipping value"
 *
 * This is the load-bearing architectural point, and the obvious fix is wrong.
 *
 * The buyer **legitimately chooses** between the seller's custom rate and a
 * carrier quote — that is the owner's spec, not a loophole. So a client must be
 * able to express *which* option it picked. What it must never be able to
 * express is *what that option costs*.
 *
 * Therefore:
 *
 *   · a posted **amount** (`chargedRate`, `rawRate`) is ignored entirely;
 *   · a posted **option identifier** is validated against the options this
 *     seller actually offers, re-priced from stored config plus a
 *     server-obtained carrier quote, and the SERVER's number is charged;
 *   · an identifier that is not on that list is a **refusal**, never a silent
 *     fallback. Falling back would charge the buyer for a method they did not
 *     choose, which is the same class of defect pointing the other way.
 *
 * ## 🛑 Capability-driven, never type-driven
 *
 * Whether an order has shipping at all is `supportsShipping` on the capability
 * registry, resolved by the caller through `cartRequiresShipping`. This module
 * takes that answer as a boolean input and never looks at a listing type. A
 * digital-code cart therefore acquires no fee and no obligation — not because
 * this file knows what a digital code is, but because its caller said no line
 * in the cart supports shipping.
 */

import { roundShippingUp, type ShippingQuoteOption } from "../../shipping/quote";
import {
  DEFAULT_STORE_SHIPPING_POLICY,
  toStoreShippingPolicy,
  type StoreShippingPolicy,
} from "./mode";

/** Which side of the offer an option came from. */
export type ShippingOptionKind = "platform" | "custom";

/**
 * What a seller will honour, as stored.
 *
 * Two INDEPENDENT axes, not one mode, and that is the whole difference from
 * `StoreShippingPolicy`: the owner's spec says *"both can be enabled"*, and a
 * single-valued mode cannot express that. `StoreShippingPolicy` survives
 * underneath as the stored shape this is DERIVED from when a store has not yet
 * saved an explicit offer (see `toSellerShippingOffer`) — one stored field, one
 * reader, no second config system. `mode.ts`'s own header records what happened
 * last time there were two.
 */
export interface SellerShippingOffer {
  /**
   * The seller accepts whatever our carrier integration quotes, and will book
   * the label through the platform.
   */
  platformQuotesAccepted: boolean;
  /** The seller ships themselves, at their own price. */
  customEnabled: boolean;
  /**
   * REQUIRED when `customEnabled` — per ORDER, not per item.
   *
   * 🛑 Per order because the seller is quoting ONE parcel. A per-item custom
   * fee is how a four-item order quietly becomes ₹800, and nothing about
   * putting four beys in one box costs four times as much.
   *
   * 🛑 `null` is NOT zero. Zero is a seller deliberately offering free
   * self-shipping, which is a real configuration; `null` is an unfinished form,
   * and `validateSellerShippingOffer` refuses to save it rather than defaulting
   * it to free. `mode.ts` already carries this exact lesson for `flat` with no
   * amount.
   */
  customFeePerOrder: number | null;
  /**
   * Goods value at or above which the seller's own rate is free. `null` = no
   * threshold.
   *
   * 🛑 Compared against the GOODS value, never a total that already contains
   * shipping — otherwise the threshold depends on itself and a cart can cross
   * ₹999 *because of* the shipping it is about to waive. Same rule, same
   * reason, as `StoreShippingPolicy.freeAbove`.
   */
  customFreeAbove: number | null;
  /** Shown beside the custom option so the buyer knows who is shipping. */
  customLabel: string | null;
}

/**
 * What a store that has configured nothing offers.
 *
 * 🛑 Custom at ₹0, NOT platform quotes — the conservative choice rather than
 * the generous-looking one, and identical in effect to
 * `DEFAULT_STORE_SHIPPING_POLICY`'s `free`. Defaulting to platform quotes would
 * hold a buyer's money against a carrier booking the seller has never agreed
 * to make, and the fulfilment obligation would bind a seller who never saw the
 * setting. A store that has not opened its shipping page keeps doing exactly
 * what it does today: charges nothing and ships manually.
 */
export const DEFAULT_SELLER_SHIPPING_OFFER: SellerShippingOffer = {
  platformQuotesAccepted: false,
  customEnabled: true,
  customFeePerOrder: 0,
  customFreeAbove: null,
  customLabel: null,
};

/** The stored offer, every field optional, every leaf a primitive. */
export interface SellerShippingOfferWire {
  platformQuotesAccepted?: boolean;
  customEnabled?: boolean;
  customFeePerOrder?: number | null;
  customFreeAbove?: number | null;
  customLabel?: string | null;
}

/** `shippingPricing` as it may arrive — the legacy mode plus the new offer. */
interface StoreShippingPricingWire {
  mode?: { kind?: string; amount?: number };
  freeAbove?: number;
  offer?: SellerShippingOfferWire;
}

function positiveOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function nonNegativeOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * The offer implied by a legacy single-mode policy.
 *
 * 🛑 This is what stops this being a THIRD shipping-config system. Every store
 * on the platform today has at most a `StoreShippingPolicy`, and the mapping is
 * lossless in the direction that matters:
 *
 *   `free`             → custom at ₹0        (seller absorbs, ships manually)
 *   `flat` amount A    → custom at ₹A        (the seller's own price)
 *   `estimate`         → platform quotes     (our carrier account books it)
 *
 * So a seller who set ₹100 on the old surface keeps charging ₹100 and gains the
 * obligation that already described what they were doing, rather than silently
 * dropping to free or silently acquiring a carrier integration.
 */
export function offerFromPolicy(policy: StoreShippingPolicy): SellerShippingOffer {
  const freeAbove = positiveOrNull(policy.freeAbove);
  switch (policy.mode.kind) {
    case "estimate":
      return {
        platformQuotesAccepted: true,
        customEnabled: false,
        customFeePerOrder: null,
        customFreeAbove: freeAbove,
        customLabel: null,
      };
    case "flat":
      return {
        platformQuotesAccepted: false,
        customEnabled: true,
        customFeePerOrder: policy.mode.amount,
        customFreeAbove: freeAbove,
        customLabel: null,
      };
    case "free":
      return { ...DEFAULT_SELLER_SHIPPING_OFFER, customFreeAbove: freeAbove };
    default: {
      // Exhaustive: a fourth mode must not compile to a silent free shipment.
      const unreachable: never = policy.mode;
      return unreachable;
    }
  }
}

/**
 * Narrow a stored `shippingPricing` value into the seller's offer.
 *
 * Reads the explicit `offer` when one has been saved, and derives it from the
 * legacy mode otherwise. An offer that stores nothing usable — neither axis
 * true — falls back to the derived policy rather than to "offers nothing",
 * because "this store offers no shipping method" must come from a seller
 * deliberately saying so (which `validateSellerShippingOffer` refuses anyway),
 * never from a half-written document.
 */
export function toSellerShippingOffer(raw: unknown): SellerShippingOffer {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SELLER_SHIPPING_OFFER };
  const wire = raw as StoreShippingPricingWire;
  const derived = offerFromPolicy(
    wire.mode || wire.freeAbove !== undefined
      ? toStoreShippingPolicy(wire)
      : DEFAULT_STORE_SHIPPING_POLICY,
  );
  const offer = wire.offer;
  if (!offer || typeof offer !== "object") return derived;

  const platformQuotesAccepted = offer.platformQuotesAccepted === true;
  const customEnabled = offer.customEnabled === true;
  if (!platformQuotesAccepted && !customEnabled) return derived;

  return {
    platformQuotesAccepted,
    customEnabled,
    /*
     * 🛑 `nonNegativeOrNull`, so a stored ₹0 survives as ₹0 and anything
     * unusable becomes `null` — never 0. A `customEnabled` offer that reaches
     * `null` here cannot produce a custom option at all (see
     * `buildShippingOptions`), which is the visible failure. Coercing it to
     * free would be the invisible one, and would charge the buyer nothing for
     * a parcel the seller still has to post.
     */
    customFeePerOrder: customEnabled ? nonNegativeOrNull(offer.customFeePerOrder) : null,
    customFreeAbove: positiveOrNull(offer.customFreeAbove),
    customLabel:
      typeof offer.customLabel === "string" && offer.customLabel.trim().length > 0
        ? offer.customLabel.trim().slice(0, 120)
        : null,
  };
}

// ── A: SAVE-TIME VALIDATION ──────────────────────────────────────────────────

/** Why a submitted offer cannot be saved. */
export type ShippingOfferRefusal =
  /** Neither axis enabled — the seller would offer no way to ship anything. */
  | "no-method"
  /** `customEnabled` with no per-order fee. The owner's spec makes this invalid. */
  | "custom-without-fee"
  /** A negative or non-finite fee. */
  | "fee-not-a-price"
  /** A free-above threshold that is not a positive amount. */
  | "threshold-not-a-price";

export type ShippingOfferValidation =
  | { ok: true; offer: SellerShippingOffer }
  | { ok: false; reason: ShippingOfferRefusal; message: string };

/**
 * May this offer be saved?
 *
 * 🛑 REFUSES rather than defaulting, and that is the owner's spec read
 * literally: *"if they select custom … then they MUST set a per-order fee"*.
 * A missing fee defaulted to ₹0 is a seller who believes they are charging for
 * postage and is not — they discover it when the payout arrives, by which time
 * the parcels have been posted and the money cannot be recovered from the
 * buyer. Refusing at save time costs one form error.
 *
 * 🛑 It also refuses an offer with NEITHER axis. A seller offering no shipping
 * method cannot fulfil a physical order, and the honest place to say so is the
 * settings form — not a buyer's checkout, where the only available answers are
 * "charge nothing" (we ship free) or "block the purchase" (the seller loses the
 * sale without being told why).
 */
export function validateSellerShippingOffer(
  input: SellerShippingOfferWire,
): ShippingOfferValidation {
  const platformQuotesAccepted = input.platformQuotesAccepted === true;
  const customEnabled = input.customEnabled === true;

  if (!platformQuotesAccepted && !customEnabled) {
    return {
      ok: false,
      reason: "no-method",
      message:
        "Enable at least one shipping method — our carrier quotes, your own rate, or both.",
    };
  }

  let customFeePerOrder: number | null = null;
  if (customEnabled) {
    const fee = input.customFeePerOrder;
    if (fee === null || fee === undefined) {
      return {
        ok: false,
        reason: "custom-without-fee",
        message:
          "Set your per-order shipping fee. Enter 0 if you ship free — leaving it blank is not the same thing.",
      };
    }
    if (typeof fee !== "number" || !Number.isFinite(fee) || fee < 0) {
      return {
        ok: false,
        reason: "fee-not-a-price",
        message: "Your per-order shipping fee must be ₹0 or more.",
      };
    }
    customFeePerOrder = roundToPaise(fee);
  }

  const threshold = input.customFreeAbove;
  if (threshold !== null && threshold !== undefined) {
    if (typeof threshold !== "number" || !Number.isFinite(threshold) || threshold <= 0) {
      return {
        ok: false,
        reason: "threshold-not-a-price",
        message: "A free-shipping threshold must be more than ₹0. Leave it blank to disable it.",
      };
    }
  }

  return {
    ok: true,
    offer: {
      platformQuotesAccepted,
      customEnabled,
      customFeePerOrder,
      customFreeAbove: threshold == null ? null : roundToPaise(threshold),
      customLabel:
        typeof input.customLabel === "string" && input.customLabel.trim().length > 0
          ? input.customLabel.trim().slice(0, 120)
          : null,
    },
  };
}

// ── B: THE OPTIONS THE BUYER MAY PICK ────────────────────────────────────────

/** The id the buyer posts back for the seller's own rate. */
export const CUSTOM_SHIPPING_OPTION_ID = "custom";

/**
 * The id for one carrier option.
 *
 * Namespaced so a carrier can never return the literal `"custom"` and collide
 * with the seller's own option — which would let a tampered pick land on the
 * wrong side of the fulfilment obligation.
 */
export function platformShippingOptionId(courierId: string): string {
  return `platform:${courierId}`;
}

/** One option as offered at checkout. Every amount is server-computed. */
export interface ShippingOptionOffer {
  /** Stable id the buyer posts back. The ONLY field a client may influence. */
  optionId: string;
  kind: ShippingOptionKind;
  label: string;
  /** What the buyer is charged for choosing this. Decimal rupees. */
  amount: number;
  /** Why the amount is what it is — rendered as the sub-label. */
  reason: "custom" | "custom-free-above" | "carrier";
  estimatedDays?: number;
  courierId?: string;
  courierName?: string;
}

export interface BuildShippingOptionsInput {
  offer: SellerShippingOffer;
  /** GOODS value of this seller's lines — see `customFreeAbove`. */
  goodsValue: number;
  /**
   * Carrier options already obtained SERVER-SIDE and already rounded by
   * `toQuoteOptions`. Empty means we could not quote.
   *
   * 🛑 Passed in rather than fetched here so this module stays pure. The
   * caller owns the outbound call; this owns the pricing.
   */
  carrierOptions?: readonly ShippingQuoteOption[];
}

/**
 * Everything this seller is willing to ship by, priced.
 *
 * 🛑 The custom fee is NOT put through `roundShippingUp`, and the platform
 * options already are. That asymmetry is deliberate and is the point of the
 * ₹50 step: it exists to make a volatile machine-read CARRIER RATE look like a
 * stable price. A seller's own ₹60 is already a price — a human typed it and
 * published it — so rounding it to ₹100 would charge the buyer ₹40 the seller
 * never asked for and show a figure that appears nowhere in the seller's
 * settings. `toQuoteOptions` applies the step to carrier rates at the one place
 * they enter the system; nothing else needs it.
 *
 * 🛑 A `customEnabled` offer with a `null` fee produces NO custom option rather
 * than a free one. See `toSellerShippingOffer` — an unfinished configuration
 * must fail visibly, not post parcels for free.
 *
 * Cheapest first, because the buyer is choosing and the owner's spec says
 * explicitly that they may take whichever is cheaper.
 */
export function buildShippingOptions(
  input: BuildShippingOptionsInput,
): ShippingOptionOffer[] {
  const { offer, goodsValue, carrierOptions = [] } = input;
  const options: ShippingOptionOffer[] = [];

  if (offer.customEnabled && offer.customFeePerOrder != null) {
    const freeByThreshold =
      offer.customFreeAbove != null && goodsValue >= offer.customFreeAbove;
    options.push({
      optionId: CUSTOM_SHIPPING_OPTION_ID,
      kind: "custom",
      label: offer.customLabel ?? "Seller's own shipping",
      amount: freeByThreshold ? 0 : roundToPaise(offer.customFeePerOrder),
      reason: freeByThreshold ? "custom-free-above" : "custom",
    });
  }

  if (offer.platformQuotesAccepted) {
    for (const courier of carrierOptions) {
      /*
       * `freeAbove` applies to the seller's OWN rate only. A carrier label
       * costs real money whoever ordered it, and waiving it would mean the
       * platform buying postage out of its own pocket on a threshold the
       * seller set. The seller's way to offer free carrier shipping is to
       * price their custom option at ₹0.
       */
      options.push({
        optionId: platformShippingOptionId(courier.courierId),
        kind: "platform",
        label: courier.courierName,
        amount: roundShippingUp(courier.chargedRate),
        reason: "carrier",
        estimatedDays: courier.estimatedDays,
        courierId: courier.courierId,
        courierName: courier.courierName,
      });
    }
  }

  return options.sort(
    (a, b) => a.amount - b.amount || (a.estimatedDays ?? 0) - (b.estimatedDays ?? 0),
  );
}

// ── C: THE SERVER'S AUTHORITY ────────────────────────────────────────────────

/**
 * What the buyer committed to, frozen onto the order so the fulfilment
 * obligation is evidenced rather than remembered.
 *
 * 🛑 This record is what makes part C of the spec enforceable at all. "The
 * seller may not buy a platform label for an order the buyer paid custom
 * shipping on" is a rule about a decision made at checkout and broken at pack
 * time, possibly days later — a rule nobody can evidence after the fact is not
 * a rule, it is an aspiration. `mustSelfFulfil` is the one field every
 * downstream gate reads.
 */
export interface ShippingObligation {
  /** Which side of the offer won. */
  kind: ShippingOptionKind;
  /** The option id charged, for the audit trail. */
  optionId: string;
  /** What the buyer actually paid for shipping. Decimal rupees. */
  chargedAmount: number;
  /** Seller-facing label of what was bought. */
  label: string;
  /**
   * 🛑 TRUE when the buyer chose the seller's own shipping.
   *
   * The seller must post it themselves and may NOT book a platform label
   * against this order, because the money was taken against the method the
   * buyer named. If they override anyway: excess back to the buyer, shortfall
   * absorbed by the seller. `reconcileShipping` already computes both
   * directions from `chargedAmount` and the real spend — this flag is what says
   * which of them the seller agreed to.
   */
  mustSelfFulfil: boolean;
  courierId?: string;
  courierName?: string;
}

export type ShippingSelectionOutcome =
  /** Shipping resolved. `option` is the SERVER's pricing, not the client's. */
  | { kind: "resolved"; option: ShippingOptionOffer; obligation: ShippingObligation }
  /**
   * No line in this order supports shipping. Zero fee, no obligation.
   *
   * 🛑 A distinct outcome rather than `resolved` at ₹0, so a caller cannot
   * accidentally write a self-fulfilment obligation onto a digital-code order.
   */
  | { kind: "not-required" }
  /**
   * The buyer posted no option. The caller falls back to the seller's stored
   * policy via `resolveShippingCost`.
   *
   * 🛑 Not a refusal, and not a hole: the fallback is a SERVER number resolved
   * from stored seller config, so no client-supplied amount reaches the total
   * on this branch either. It exists because a digital cart, a cart whose
   * carrier quote failed, and every client written before the picker all omit
   * the field — refusing them would convert a pricing bug into a checkout
   * outage.
   */
  | { kind: "unselected" }
  /**
   * The posted option is not one this seller offers. REFUSE the order.
   *
   * 🛑 Never a silent fallback to the cheapest available. The buyer agreed to a
   * named method at a named price; substituting another is the same wrong as
   * trusting their number, pointed the other way.
   */
  | {
      kind: "refused";
      reason: "option-not-offered" | "no-method-available";
      message: string;
    };

export interface ResolveShippingSelectionInput {
  /**
   * Does any line in this order support shipping?
   *
   * 🛑 A CAPABILITY answer the caller resolves through `cartRequiresShipping`
   * (which reads `supportsShipping` off the registry), never a listing-type
   * comparison. This module must not know what a digital code is.
   */
  shippingRequired: boolean;
  offer: SellerShippingOffer;
  goodsValue: number;
  carrierOptions?: readonly ShippingQuoteOption[];
  /**
   * The option id the client posted, if any.
   *
   * 🛑 An IDENTIFIER, never an amount. A client that also posts a `chargedRate`
   * has it ignored — the caller is responsible for not passing one, and the
   * type here is what makes that mechanical rather than disciplinary.
   */
  requestedOptionId?: string;
}

/**
 * Re-resolve the buyer's chosen OPTION against the seller's stored offer and a
 * server-obtained carrier quote, and return the SERVER's price for it.
 *
 * This is the single function that answers "what is this order charged for
 * shipping, and what did the seller therefore agree to do".
 */
export function resolveShippingSelection(
  input: ResolveShippingSelectionInput,
): ShippingSelectionOutcome {
  const { shippingRequired, offer, goodsValue, carrierOptions, requestedOptionId } = input;

  /*
   * 🛑 FIRST, before anything else. A cart with no shippable line must acquire
   * no fee and no obligation even if a client posts an option id — a stale
   * picker on a digital-code checkout must not be able to attach a parcel
   * obligation to a code delivered by email.
   */
  if (!shippingRequired) return { kind: "not-required" };

  const options = buildShippingOptions({ offer, goodsValue, carrierOptions });

  if (!requestedOptionId) return { kind: "unselected" };

  const chosen = options.find((o) => o.optionId === requestedOptionId);
  if (!chosen) {
    /*
     * Two different failures, two different messages, because the buyer can act
     * on one of them and not the other. "We could not get carrier rates" means
     * pick the other option or retry; "that option is not available" means the
     * page is stale and should be reloaded.
     */
    if (options.length === 0) {
      return {
        kind: "refused",
        reason: "no-method-available",
        message:
          "This seller has no shipping method available for your address right now. Please try again shortly.",
      };
    }
    return {
      kind: "refused",
      reason: "option-not-offered",
      message:
        "The shipping option you selected is no longer offered for this order. Please reload checkout and choose again.",
    };
  }

  return {
    kind: "resolved",
    option: chosen,
    obligation: {
      kind: chosen.kind,
      optionId: chosen.optionId,
      chargedAmount: chosen.amount,
      label: chosen.label,
      mustSelfFulfil: chosen.kind === "custom",
      ...(chosen.courierId ? { courierId: chosen.courierId } : {}),
      ...(chosen.courierName ? { courierName: chosen.courierName } : {}),
    },
  };
}

/**
 * The obligation an offer implies when the buyer made NO choice.
 *
 * ## 🛑 Why this exists, and why it only answers sometimes
 *
 * The gateway (online-payment) checkout prices shipping from the seller's
 * stored policy and does not yet carry the buyer's per-store option — see the
 * gap recorded at `createPhonePeGroupOrder`. Without this, every online order
 * would carry NO `shippingObligation`, and `mayBookPlatformLabel` fails open on
 * absence — so a seller who ships their own parcels could book a platform label
 * against an order the buyer paid their custom rate for, which is the exact
 * thing part C of the spec forbids.
 *
 * 🛑 It returns `null` whenever the offer leaves a genuine CHOICE (both axes
 * enabled), because then the buyer's pick is the only thing that can decide and
 * inventing one would record a contract nobody agreed to. It answers only when
 * the seller offers exactly one method, where the method is a fact about the
 * seller rather than a guess about the buyer.
 *
 * 🛑 It also returns `null` when nothing was charged. An obligation with no
 * payment behind it would bind a seller to a price nobody paid.
 */
export function impliedObligation(
  offer: SellerShippingOffer,
  chargedAmount: number,
  shippingRequired: boolean,
): ShippingObligation | null {
  if (!shippingRequired) return null;
  if (!(chargedAmount > 0)) return null;
  if (offer.customEnabled === offer.platformQuotesAccepted) return null;
  if (!offer.customEnabled) return null;
  return {
    kind: "custom",
    optionId: CUSTOM_SHIPPING_OPTION_ID,
    chargedAmount,
    label: offer.customLabel ?? "Seller's own shipping",
    mustSelfFulfil: true,
  };
}

/**
 * May the seller book a PLATFORM label against this order?
 *
 * 🛑 The enforcement point for part C, and it reads the frozen obligation
 * rather than re-deriving anything. Gated on what the buyer CHOSE, exactly as
 * `isReimbursableShipment` is gated on who BOOKED — a fact about the
 * transaction, never something the claimant supplies at claim time.
 *
 * Absence returns TRUE, i.e. fails open, and that is a prerequisite rather than
 * a bug: no order written before this field existed carries it, and a
 * fail-closed gate would refuse every seller on every historical order. The day
 * the Shiprocket booking path is wired, THE SAME COMMIT must call this — see
 * `isReimbursableShipment`'s note for the identical hazard on the identical
 * shape.
 */
export function mayBookPlatformLabel(order: {
  shippingObligation?: Pick<ShippingObligation, "mustSelfFulfil">;
}): boolean {
  return order.shippingObligation?.mustSelfFulfil !== true;
}

/**
 * Two decimal places. Money is stored as decimal rupees (Root Cause #31), so a
 * seller typing `59.999` or a float artefact must not become a price with
 * eleven decimal places on an invoice.
 */
function roundToPaise(value: number): number {
  return Math.round(value * 100) / 100;
}
