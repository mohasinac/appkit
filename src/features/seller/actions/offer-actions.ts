/**
 * Offer Domain Actions (appkit/features/seller)
 *
 * Business logic for the Make-an-Offer feature lifecycle.
 * Auth, rate-limiting, and input validation are handled by the calling server action.
 */

import { serverLogger } from "../../../monitoring";
// Money in prose reads from the configured market profile — symbol, grouping
// and locale. These strings used `₹${n}`, which also rendered ungrouped.
import { formatMoney } from "../../../utils/number.formatter";
import { offerRepository } from "../repository/offer.repository";
import { productRepository } from "../../products/repository/products.repository";
import { categoriesRepository } from "../../categories/repository/categories.repository";
import { resolveParcel } from "../../../_internal/shared/features/shipping/parcel";
import {
  checkDestinations,
  assertAllServiceable,
} from "../../../_internal/server/features/shipping/book-split";
import { ProductStatusValues } from "../../products/schemas";
import { sendNotification } from "../../admin/actions/notification-actions";
import { userRepository } from "../../auth/repository/user.repository";
import { storeRepository } from "../../stores/repository/store.repository";
import { cartRepository } from "../../cart/repository/cart.repository";

import {
  ERROR_MESSAGES,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  OFFER_ERROR_CODES,
} from "../../../errors";

import { canMakeOffer } from "../../../_internal/shared/listing-types/capabilities";
import { normalizeListingType } from "../../products/utils/listing-type";
import { OfferStatusValues } from "../schemas";
import type { OfferDocument, OfferPlain } from "../schemas";
import {
  DEFAULT_MIN_OFFER_PERCENT,
  offerIsOnlyPurchasePath,
  offersEnabledFor,
  resolveOfferBounds,
} from "../../../_internal/shared/features/offers/config";

/**
 * How long an accepted offer stays claimable at its locked price. Shared by the
 * seller-accept path, the buyer-accepts-counter path, and the expiry sweep so
 * all three can't drift.
 */
export const OFFER_CHECKOUT_WINDOW_MS = 48 * 60 * 60 * 1000;

const ERR_OFFER_NOT_FOUND = "Offer not found";
const ERR_NOT_AUTHORISED = "Not authorized";
import type { CartDocument } from "../../cart/schemas/firestore";

export interface MakeOfferInput {
  productId: string;
  offerAmount: number;
  buyerNote?: string;
}

export interface RespondToOfferInput {
  offerId: string;
  action: "accept" | "decline" | "counter";
  counterAmount?: number;
  sellerNote?: string;
}

export interface BuyerCounterInput {
  offerId: string;
  counterAmount: number;
  buyerNote?: string;
}

// --- Buyer: Make an Offer --------------------------------------------------

export async function makeOffer(
  userId: string,
  userEmail: string,
  input: MakeOfferInput,
/*
 * `OfferPlain`: `createOffer` echoes the plaintext it was handed rather than
 * re-reading the document, so what comes back is plaintext. Declaring
 * `OfferDocument` claimed the buyer's name and email were ciphertext when
 * they are not — the mismatch `Encrypted<string>` exists to surface.
 */
): Promise<OfferPlain> {
  const { productId, offerAmount, buyerNote } = input;

  /**
   * Two independent gates, checked in widening-to-narrowing order: the listing
   * type's `canMakeOffer` capability, then the seller's own `allowOffers`
   * opt-in.
   *
   * There was a third — the site-wide `featureFlags.offers` kill switch — which
   * cost a Firestore singleton read on every offer attempt. It went with the
   * rest of that group on 2026-08-29. The two that remain are the ones somebody
   * actually sets: a per-type capability and a per-listing choice by the seller
   * who owns the item.
   *
   * Both now go through `offersEnabledFor` / `resolveOfferBounds`, which the
   * buyer's form reads too — the whole point of moving the rule into the shared
   * config. A second copy here is how the form came to advertise a 50% floor
   * this function then rejected (see the config's own header).
   */
  const product = await productRepository.findById(productId);
  if (!product) throw new NotFoundError(ERROR_MESSAGES.PRODUCT.NOT_FOUND);

  /*
   * 🛑 A seller may not offer on their OWN listing. There was no such check.
   *
   * Measured on production as tyson@beybladearena.in, who owns
   * store-beyblade-arena: product-beyblade-burst-valkyrie — sold by that very
   * store — offered a live 'Make Offer' control, and clicking it opened the
   * full form ("Listed at ₹999 · Minimum offer: ₹699.3") with a working
   * 'Send offer of ₹899.1' button and the buyer-facing line "The seller will
   * accept, decline, or suggest a counter price" shown TO that seller.
   *
   * The three gates above it are all real but none of them is about identity:
   * the type's `canMakeOffer`, the seller's `allowOffers` opt-in, and the
   * amount bounds. So a self-offer would have been accepted and written, and
   * the same person would then appear on both sides of a negotiation — able to
   * accept their own offer and, through the offer lane, mint a locked cart line
   * at any price down to the minimum floor. That is a pricing bypass, not a
   * cosmetic one.
   *
   * The check is HERE rather than only in the UI on purpose (Root Cause #46): a
   * hidden button is not an authorization boundary, and the control was already
   * reachable. `product.storeId` is the store SLUG while `userId` is an Auth
   * uid — two different namespaces by design — so the owner is resolved through
   * `findByOwnerId`, exactly as `sellerUpdateProduct` does.
   *
   * Admins are not exempted: there is no legitimate reason for anyone to
   * negotiate with themselves, and an admin wanting to adjust a price has the
   * listing editor.
   */
  const callerStore = await storeRepository.findByOwnerId(userId);
  if (callerStore && callerStore.id === product.storeId) {
    throw new ValidationError(
      "You can't make an offer on your own listing — edit its price instead.",
    );
  }

  const listingType = normalizeListingType(product);

  // Some listing types cannot be negotiated at all — a collector drop already has
  // bidding, random-lots sells fixed-price entries. This was never checked, so
  // an offer could be (and in seed data was) attached to a collector drop, producing
  // a cart line that claims `listingType: "standard"` in the offer lane.
  if (!canMakeOffer(listingType)) {
    throw new ValidationError("Offers aren't available for this kind of listing.");
  }

  if (!offersEnabledFor(listingType, product.allowOffers))
    throw new ValidationError("This product does not accept offers.");

  const bounds = resolveOfferBounds({
    listingType,
    listedPrice: product.price,
    minOfferPercent: product.minOfferPercent,
    allowOffers: product.allowOffers,
  });

  if (bounds.isBuyRequest) {
    // No cart on this type and the seller has not opted into haggling, so the
    // asking price is the only legal amount. Naming that plainly beats a
    // "minimum offer is ₹X" message where X happens to equal the price.
    if (offerAmount !== bounds.max)
      throw new ValidationError(
        `This seller is not taking lower offers — send a request to buy at ${formatMoney(bounds.max)}.`,
      );
  } else {
    if (offerAmount < bounds.min)
      throw new ValidationError(
        `Minimum offer is ${formatMoney(bounds.min)} (${product.minOfferPercent ?? DEFAULT_MIN_OFFER_PERCENT}% of listing price).`,
      );
    if (offerAmount > bounds.max)
      throw new ValidationError(
        // Deliberately NOT "use Add to Cart instead" unconditionally: on a
        // listing whose only purchase path is an offer there is no cart button,
        // so that advice named a control the page does not have.
        offerIsOnlyPurchasePath(listingType)
          ? `Your offer cannot exceed the asking price of ${formatMoney(product.price)}.`
          : "Your offer must be below the listed price. Use Add to Cart instead.",
      );
  }

  const offerCount = await offerRepository.countByBuyerAndProduct(
    userId,
    productId,
    product.updatedAt,
  );
  if (offerCount >= 3)
    throw new ValidationError(ERROR_MESSAGES.OFFER.LIMIT_REACHED);

  const alreadyActive = await offerRepository.hasActiveOffer(userId, productId);
  if (alreadyActive)
    throw new ValidationError(ERROR_MESSAGES.OFFER.ACTIVE_OFFER_EXISTS);

  const profile = await userRepository.findById(userId);
  /*
   * 🛑 REVEALED. `createOffer` encrypts `buyerEmail` (`OFFER_PII_FIELDS`), so
   * the ciphertext this read returns would have been encrypted a second time
   * and become permanently unreadable — the seller could never see who made
   * the offer. The sibling `bid-actions.ts:223,481` was fixed for exactly this;
   * this line is the same shape, missed.
   *
   * `userEmail` (the parameter) is already plaintext, so it needs no unwrap.
   */
  const profilePlain = profile ? userRepository.revealUser(profile) : null;
  const buyerDisplayName = profile?.displayName ?? "Buyer";

  if (!product.storeId)
    throw new ValidationError("Product is not associated with a store.");

  const offer = await offerRepository.createOffer({
    productId,
    productTitle: product.title,
    productSlug: product.slug,
    productImageUrl: product.mainImage,
    buyerUid: userId,
    buyerName: buyerDisplayName,
    buyerEmail: profilePlain?.email ?? userEmail ?? "",
    storeId: product.storeId,
    storeName: product.storeName ?? "",
    offerAmount,
    listedPrice: product.price,
    currency: product.currency,
    buyerNote,
  });

  const sellerStore = product.storeId ? await storeRepository.findById(product.storeId) : null;
  if (sellerStore?.ownerId) {
    await sendNotification({
      userId: sellerStore.ownerId,
      type: "offer_received",
      priority: "normal",
      title: "New offer received",
      message: `${buyerDisplayName === "Buyer" ? "A buyer" : buyerDisplayName} offered ${formatMoney(offerAmount)} on "${product.title}"`,
      relatedId: offer.id,
      relatedType: "offer",
    });
  }

  serverLogger.info("makeOffer", {
    offerId: offer.id,
    buyerUid: userId,
    productId,
    offerAmount,
  });
  return offer;
}

// --- Seller: Respond ------------------------------------------------------

export async function respondToOffer(
  userId: string,
  input: RespondToOfferInput,
): Promise<OfferDocument> {
  const { offerId, action, counterAmount, sellerNote } = input;

  const offer = await offerRepository.findById(offerId);
  if (!offer) throw new NotFoundError(ERR_OFFER_NOT_FOUND);
  const offerStore = offer.storeId ? await storeRepository.findById(offer.storeId) : null;
  if (!offerStore || offerStore.ownerId !== userId)
    throw new AuthorizationError("Not authorised to respond to this offer.");
  if (offer.status !== OfferStatusValues.PENDING)
    throw new ValidationError(
      `Offer is already ${offer.status}. No further action is possible.`,
    );
  if (new Date() > offer.expiresAt)
    throw new ValidationError(ERROR_MESSAGES.OFFER.EXPIRED);

  let updated: OfferDocument;
  /**
   * The buyer-facing sentence for a COUNTER, assembled in the branch that owns
   * the amount. `""` is unreachable — the ternary below only selects it when
   * `action === "counter"`, which is exactly the branch that assigns it.
   */
  let counterMessage = "";

  if (action === "accept") {
    /*
     * ── S5a: a coordinated offer must be SHIPPABLE before it is binding ──
     *
     * Accepting locks a price and starts the buyer's checkout deadline, so it
     * is the last moment at which "the courier cannot reach one of these
     * addresses" costs nobody anything. After it, the coordinator has paid
     * and the only remedies left are a refund and an apology.
     *
     * 🛑 Deliberately NOT at booking time, which is the obvious place and the
     * wrong one: by then the money is taken, and a four-destination order
     * that fails on the fourth has three parcels the carrier already accepted
     * and no rollback. `assertAllServiceable` still guards the booking path —
     * this is the check that keeps it from ever being reached in that state.
     *
     * 🛑 Costs NOTHING on an ordinary offer. `coordination` is absent on
     * every non-coordinated one, so this whole block is skipped — a check
     * that charges every seller for a feature most never use is how Rule #6's
     * round-trip budget gets spent by accident.
     *
     * 🛑 The weight comes from `resolveParcel`, NOT from a literal. That
     * module's whole argument is that an item weight systematically
     * under-estimates a packed box (a bey is ~30 g loose and ~300 g boxed),
     * and a hard-coded `1` here would be a fourth, worse tier beside the
     * three it defines. The shipment tier is deliberately absent — nothing is
     * packed yet at accept time, which is exactly the case tier two and three
     * exist for.
     *
     * 🛑 **No resolvable weight SKIPS the check** rather than guessing one.
     * The carrier is being asked "can you reach this pincode with a parcel of
     * this size", so an invented weight asks a question about a parcel that
     * does not exist and may refuse a destination that is perfectly
     * reachable. Not checking is honest; the booking path still has
     * `assertAllServiceable`, and a listing with no weight at any tier has a
     * data problem this is not the place to report.
     */
    const members = offer.coordination?.members ?? [];
    if (members.length > 0) {
      const offerProduct = await productRepository.findById(offer.productId);
      /*
       * 🛑 `categorySlugs[0]` is the LEAF, and `findById` is the right lookup
       * for it. Products carry the full ancestor chain `[leaf, …, root]` and
       * categories are pure slugs (`id === slug`), so this is one get rather
       * than the `where("slug","==")` query `findBySlugAndType` would run —
       * and the leaf is the tier whose packed default is actually about this
       * kind of item. A root's default would be the average of the catalogue.
       */
      const leafSlug = offerProduct?.categorySlugs?.[0];
      const leaf = leafSlug ? await categoriesRepository.findById(leafSlug) : null;
      const parcel = resolveParcel(null, offerProduct, leaf?.productDefaults ?? null);
      if (parcel) {
        assertAllServiceable(await checkDestinations(members, parcel.weightG / 1000));
      }
    }

    updated = await offerRepository.accept(
      offerId,
      offer.offerAmount,
      sellerNote,
      new Date(Date.now() + OFFER_CHECKOUT_WINDOW_MS),
    );
  } else if (action === "decline") {
    updated = await offerRepository.decline(offerId, sellerNote);
  } else {
    if (!counterAmount)
      throw new ValidationError("Counter amount is required when countering.");
    if (counterAmount >= offer.listedPrice)
      throw new ValidationError("Counter must be below the listed price.");
    if (counterAmount === offer.offerAmount)
      throw new ValidationError(
        "Counter amount must differ from the buyer's offer. Accept it instead.",
      );
    updated = await offerRepository.counter(offerId, counterAmount, sellerNote);
    /*
     * 🛑 Built HERE, where the guards above have proven `counterAmount` is a
     * number, rather than in the ternary below.
     *
     * That ternary used to read `₹${counterAmount}` against the
     * possibly-undefined parameter — so a counter reaching it without an amount
     * told the buyer the seller "countered with ₹undefined". `tsc` only
     * surfaced it once the literal became `formatMoney(...)`, which is the
     * argument for the conversion beyond consistency.
     *
     * Neither `!` nor `?? 0` is the fix: the first re-asserts what narrowing
     * already knows and the second would quote a real-looking "₹0" to a buyer.
     * Assigning the finished sentence in the branch that owns the value makes
     * the absent case unrepresentable instead.
     */
    counterMessage = `${offer.storeName} countered with ${formatMoney(counterAmount)} on "${offer.productTitle}".`;
  }

  const notifMessage =
    action === "accept"
      ? `Your offer of ${formatMoney(offer.offerAmount)} on "${offer.productTitle}" was accepted! Complete checkout now.`
      : action === "decline"
        ? `Your offer on "${offer.productTitle}" was declined.`
        : counterMessage;

  await sendNotification({
    userId: offer.buyerUid,
    type: "offer_responded",
    priority: action === "accept" ? "high" : "normal",
    title:
      action === "accept"
        ? "Offer accepted!"
        : action === "decline"
          ? "Offer declined"
          : "Counter offer received",
    message: notifMessage,
    relatedId: offerId,
    relatedType: "offer",
  });

  serverLogger.info(`respondToOffer: ${action}`, {
    offerId,
    sellerUid: userId,
    action,
  });
  return updated;
}

// --- Buyer: Accept counter -------------------------------------------------

export async function acceptCounterOffer(
  userId: string,
  offerId: string,
): Promise<OfferDocument> {
  const offer = await offerRepository.findById(offerId);
  if (!offer) throw new NotFoundError(ERR_OFFER_NOT_FOUND);
  if (offer.buyerUid !== userId)
    throw new AuthorizationError(ERR_NOT_AUTHORISED);
  if (offer.status !== OfferStatusValues.COUNTERED)
    throw new ValidationError("No counter to accept.");
  /*
   * 🛑 A COUNTERED offer with no amount is a data-integrity violation, not a
   * case to paper over. The seller notification below quotes this figure, and
   * it previously interpolated the optional field directly — so such a row
   * would have told the seller the buyer "accepted your counter of ₹undefined",
   * and accepting it would have locked a cart line at a price nobody set.
   *
   * Refusing is the only honest answer: `counterAmount` is what the buyer is
   * agreeing to, so if it is missing there is nothing to agree to. Narrowing it
   * here is a side effect of saying so, not the reason.
   */
  if (typeof offer.counterAmount !== "number")
    throw new ValidationError(
      "This counter has no amount recorded — ask the seller to send it again.",
    );
  if (new Date() > offer.expiresAt)
    throw new ValidationError(ERROR_MESSAGES.OFFER.EXPIRED);

  const updated = await offerRepository.acceptCounter(
    offerId,
    new Date(Date.now() + OFFER_CHECKOUT_WINDOW_MS),
  );

  const counterStore = offer.storeId ? await storeRepository.findById(offer.storeId) : null;
  if (counterStore?.ownerId) await sendNotification({
    userId: counterStore.ownerId,
    type: "offer_counter_accepted",
    priority: "high",
    title: "Counter offer accepted",
    message: `Buyer accepted your counter of ${formatMoney(offer.counterAmount)} on "${offer.productTitle}". They can now checkout.`,
    relatedId: offerId,
    relatedType: "offer",
  });

  return updated;
}

// --- Buyer: Counter back --------------------------------------------------

export async function counterOfferByBuyer(
  userId: string,
  userEmail: string,
  input: BuyerCounterInput,
/*
 * `OfferPlain`: `createOffer` echoes the plaintext it was handed rather than
 * re-reading the document, so what comes back is plaintext. Declaring
 * `OfferDocument` claimed the buyer's name and email were ciphertext when
 * they are not — the mismatch `Encrypted<string>` exists to surface.
 */
): Promise<OfferPlain> {
  const { offerId, counterAmount, buyerNote } = input;

  const offer = await offerRepository.findById(offerId);
  if (!offer) throw new NotFoundError(ERR_OFFER_NOT_FOUND);
  if (offer.buyerUid !== userId)
    throw new AuthorizationError(ERR_NOT_AUTHORISED);
  if (offer.status !== OfferStatusValues.COUNTERED)
    throw new ValidationError(ERROR_MESSAGES.OFFER.NOT_COUNTERED);
  if (new Date() > offer.expiresAt)
    throw new ValidationError(ERROR_MESSAGES.OFFER.EXPIRED);
  if (!offer.counterAmount)
    throw new ValidationError("No counter amount found on this offer.");

  const sellerCounter = offer.counterAmount;
  const minAllowed = Math.floor(sellerCounter * 0.8);
  const maxAllowed = Math.ceil(sellerCounter * 1.2);
  if (counterAmount < minAllowed || counterAmount > maxAllowed)
    throw new ValidationError(
      `${ERROR_MESSAGES.OFFER.COUNTER_RANGE} Allowed: ${formatMoney(minAllowed)}–${formatMoney(maxAllowed)}.`,
    );

  if (counterAmount >= offer.listedPrice)
    throw new ValidationError(
      "Counter offer cannot reach or exceed the listed price. Accept the seller's counter instead.",
    );

  const product = await productRepository.findById(offer.productId);
  if (!product) throw new NotFoundError(ERROR_MESSAGES.PRODUCT.NOT_FOUND);

  const offerCount = await offerRepository.countByBuyerAndProduct(
    userId,
    offer.productId,
    product.updatedAt,
  );
  if (offerCount >= 3)
    throw new ValidationError(ERROR_MESSAGES.OFFER.LIMIT_REACHED);

  // ── Create BEFORE superseding. Order matters. ───────────────────────────
  //
  // This used to `withdraw()` first and `create()` second. If `create` threw —
  // a validation slip, a Firestore blip — the buyer's live counter was ALREADY
  // withdrawn, no replacement existed, the negotiation was dead, and one of
  // their three offer slots had been burnt for nothing.
  //
  // Reversed, the worst failure is a transient extra pending offer, which
  // `hasActiveOffer` and the expiry sweep both already handle.
  //
  // The chain fields are what make a multi-round negotiation readable at all:
  // `previousOfferId` used to exist ONLY inside the serverLogger call below
  // and never reached Firestore, so three rounds were three unrelated
  // documents. `chainRootOfferId` is denormalised onto every round so a list
  // row can render "Round 2" with zero extra reads, and `findChain` stays a
  // single-field equality served by the automatic index.
  const chainRoot = offer.chainRootOfferId ?? offer.id;
  const nextRound = (offer.counterRound ?? 1) + 1;

  /*
   * 🛑 A NINTH double-encryption site, found by the nominal brand.
   *
   * A buyer counter creates a NEW offer document carrying the previous round's
   * buyer identity forward. `offer` came from a read, so those two fields are
   * ciphertext — and `createOffer` encrypts `buyerName`/`buyerEmail` again
   * (`OFFER_PII_FIELDS`), so round 2 onward stored a permanently unreadable
   * buyer. Rounds 1 was fine, which is why nothing looked wrong.
   */
  const offerPlain = offerRepository.revealOffer(offer);

  const newOffer = await offerRepository.createOffer({
    productId: offer.productId,
    productTitle: offer.productTitle,
    productSlug: offer.productSlug,
    productImageUrl: offer.productImageUrl,
    buyerUid: userId,
    buyerName: offerPlain.buyerName,
    buyerEmail: offerPlain.buyerEmail,
    storeId: offer.storeId,
    storeName: offer.storeName,
    offerAmount: counterAmount,
    listedPrice: offer.listedPrice,
    currency: offer.currency,
    buyerNote,
    // NOT carrying `sellerNote` forward: it would render as "Seller note" on
    // the new round, making the seller look like they had already answered a
    // counter they have never seen. Round N-1 keeps its own note and is now
    // reachable via `previousOfferId`.
    previousOfferId: offer.id,
    chainRootOfferId: chainRoot,
    counterRound: nextRound,
  });

  // Now supersede the old round — one write, one history entry. A `withdrawn`
  // document carrying `supersededByOfferId` renders as *Superseded* (neutral),
  // not *Withdrawn* (negative): the buyer did not walk away, they countered.
  await offerRepository.withdraw(
    offerId,
    newOffer.id,
    { actor: { uid: userId, role: "buyer" } },
    offer,
  );

  const buyerCounterStore = offer.storeId ? await storeRepository.findById(offer.storeId) : null;
  if (buyerCounterStore?.ownerId) await sendNotification({
    userId: buyerCounterStore.ownerId,
    type: "offer_received",
    priority: "normal",
    title: "Buyer counter offer",
    /*
     * 🛑 `offerPlain.buyerName`, NOT `offer.buyerName`.
     *
     * `buyerName` is in `OFFER_PII_FIELDS`, so the raw document holds
     * `enc:v1:…` — and `sendNotification` BAKES this string into the
     * notification document at write time. Reading the encrypted field here
     * stamped ciphertext permanently into a seller's inbox on every buyer
     * counter-offer, unfixable after the fact because the message is frozen
     * at write.
     *
     * This is the same mechanism that previously put `enc:v1:…` into 383
     * admin alerts (see `onOrderCreate`'s decrypt comment). The plaintext was
     * already in scope 41 lines up — `offerPlain` at :431, used for the
     * `createOffer` call at :439.
     */
    message: `${offerPlain.buyerName} countered with ${formatMoney(counterAmount)} on "${offer.productTitle}".`,
    relatedId: newOffer.id,
    relatedType: "offer",
  });

  // `previousOfferId` is no longer logged as its only record — it is a
  // persisted field on `newOffer` now. A log line is not a data model.
  serverLogger.info("counterOfferByBuyer", {
    newOfferId: newOffer.id,
    buyerUid: userId,
    productId: offer.productId,
    counterAmount,
    counterRound: nextRound,
  });

  return newOffer;
}

// --- Buyer: Withdraw offer -------------------------------------------------

export async function withdrawOffer(
  userId: string,
  offerId: string,
): Promise<void> {
  const offer = await offerRepository.findById(offerId);
  if (!offer) throw new NotFoundError(ERR_OFFER_NOT_FOUND);
  if (offer.buyerUid !== userId)
    throw new AuthorizationError(ERR_NOT_AUTHORISED);
  if (offer.status === OfferStatusValues.EXPIRED)
    throw new ValidationError("This offer has already expired.");
  if (
    !(
      [OfferStatusValues.PENDING, OfferStatusValues.COUNTERED] as string[]
    ).includes(offer.status)
  )
    throw new ValidationError("Offer cannot be withdrawn at this stage.");

  await offerRepository.withdraw(offerId);
  serverLogger.info("withdrawOffer", { offerId, buyerUid: userId });
}

// --- Read ------------------------------------------------------------------

export async function listBuyerOffers(
  userId: string,
): Promise<OfferPlain[]> {
  const result = await offerRepository.findByBuyer(userId);
  /*
   * REVEALED: these are the buyer's OWN offers, so showing them their own name
   * and email in full is the canonical legitimate plaintext read. The seller's
   * view of the same documents goes through `maskedOffer` instead.
   */
  return result.items.map((o) => offerRepository.revealOffer(o));
}

export async function listSellerOffers(
  userId: string,
  // Masked rows, so the declared type says so.
): Promise<OfferPlain[]> {
  const store = await storeRepository.findByOwnerId(userId);
  if (!store) return [];
  const result = await offerRepository.findByStore(store.id);
  /*
   * `maskedOffer`, not `maskOfferForSeller`. The latter calls `maskName`,
   * which refuses ciphertext by design and answers "Anonymous" — and
   * `findByStore` returns raw documents. So the seller's own offers list
   * showed every buyer as Anonymous. `maskedOffer` decrypts first, then masks.
   */
  return result.items.map((o) => offerRepository.maskedOffer(o));
}

// --- Buyer: Checkout accepted offer ----------------------------------------

export async function checkoutOffer(
  userId: string,
  offerId: string,
): Promise<CartDocument> {
  const offer = await offerRepository.findById(offerId);
  if (!offer) throw new NotFoundError(ERR_OFFER_NOT_FOUND);
  if (offer.buyerUid !== userId)
    throw new AuthorizationError(ERR_NOT_AUTHORISED);
  if (offer.status !== OfferStatusValues.ACCEPTED)
    throw new ValidationError("Only accepted offers can be checked out.");
  if (!offer.lockedPrice)
    throw new ValidationError("Offer price not confirmed. Contact support.");
  if (offer.checkoutDeadline && new Date() > offer.checkoutDeadline)
    throw new ValidationError(
      "This accepted offer has expired. Please make a new offer.",
      { code: OFFER_ERROR_CODES.CHECKOUT_EXPIRED },
    );

  const product = await productRepository.findById(offer.productId);
  if (!product) throw new NotFoundError(ERROR_MESSAGES.PRODUCT.NOT_FOUND);
  if (
    (product.availableQuantity ?? 0) <= 0 ||
    product.isSold === true ||
    product.status === ProductStatusValues.ARCHIVED
  )
    throw new ValidationError(ERROR_MESSAGES.OFFER.PRODUCT_UNAVAILABLE);

  serverLogger.info("checkoutOffer — adding to cart", {
    offerId,
    buyerUid: userId,
    lockedPrice: offer.lockedPrice,
  });

  return cartRepository.addItem(userId, {
    productId: offer.productId,
    productTitle: offer.productTitle,
    productImage: offer.productImageUrl ?? product.mainImage ?? "",
    price: offer.lockedPrice,
    currency: offer.currency,
    quantity: 1,
    storeId: offer.storeId,
    storeName: offer.storeName,
    listingType: "standard",
    isOffer: true,
    offerId: offer.id,
    lockedPrice: offer.lockedPrice,
  });
}
