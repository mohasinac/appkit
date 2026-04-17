/**
 * Offer Domain Actions (appkit/features/seller)
 *
 * Business logic for the Make-an-Offer feature lifecycle.
 * Auth, rate-limiting, and input validation are handled by the calling server action.
 */

import { serverLogger } from "../../../monitoring";
import { offerRepository } from "../repository/offer.repository";
import { productRepository } from "../../products/repository/products.repository";
import { ProductStatusValues } from "../../products/schemas";
import { notificationRepository } from "../../admin/repository/notification.repository";
import { userRepository } from "../../auth/repository/user.repository";
import { cartRepository } from "../../cart/repository/cart.repository";
import { maskOfferForSeller } from "../../../security";
import {
  ERROR_MESSAGES,
  AuthorizationError,
  ValidationError,
  NotFoundError,
} from "../../../errors";
import { OfferStatusValues } from "../schemas";
import type { OfferDocument } from "../schemas";
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

// ─── Buyer: Make an Offer ──────────────────────────────────────────────────

export async function makeOffer(
  userId: string,
  userEmail: string,
  input: MakeOfferInput,
): Promise<OfferDocument> {
  const { productId, offerAmount, buyerNote } = input;

  const product = await productRepository.findById(productId);
  if (!product) throw new NotFoundError(ERROR_MESSAGES.PRODUCT.NOT_FOUND);
  if (!product.allowOffers)
    throw new ValidationError("This product does not accept offers.");

  const minAllowed = Math.ceil(
    product.price * ((product.minOfferPercent ?? 70) / 100),
  );
  if (offerAmount < minAllowed)
    throw new ValidationError(
      `Minimum offer is ₹${minAllowed} (${product.minOfferPercent ?? 70}% of listing price).`,
    );
  if (offerAmount >= product.price)
    throw new ValidationError(
      "Your offer must be below the listed price. Use Add to Cart instead.",
    );

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
  const buyerDisplayName = profile?.displayName ?? "Buyer";

  const offer = await offerRepository.create({
    productId,
    productTitle: product.title,
    productSlug: product.slug,
    productImageUrl: product.mainImage,
    buyerUid: userId,
    buyerName: buyerDisplayName,
    buyerEmail: profile?.email ?? userEmail ?? "",
    sellerId: product.sellerId,
    sellerName: product.sellerName,
    offerAmount,
    listedPrice: product.price,
    currency: product.currency,
    buyerNote,
  });

  await notificationRepository.create({
    userId: product.sellerId,
    type: "offer_received",
    priority: "normal",
    title: "New offer received",
    message: `${buyerDisplayName === "Buyer" ? "A buyer" : buyerDisplayName} offered ₹${offerAmount} on "${product.title}"`,
    relatedId: offer.id,
    relatedType: "offer",
  });

  serverLogger.info("makeOffer", {
    offerId: offer.id,
    buyerUid: userId,
    productId,
    offerAmount,
  });
  return offer;
}

// ─── Seller: Respond ──────────────────────────────────────────────────────

export async function respondToOffer(
  userId: string,
  input: RespondToOfferInput,
): Promise<OfferDocument> {
  const { offerId, action, counterAmount, sellerNote } = input;

  const offer = await offerRepository.findById(offerId);
  if (!offer) throw new NotFoundError("Offer not found.");
  if (offer.sellerId !== userId)
    throw new AuthorizationError("Not authorised to respond to this offer.");
  if (offer.status !== OfferStatusValues.PENDING)
    throw new ValidationError(
      `Offer is already ${offer.status}. No further action is possible.`,
    );
  if (new Date() > offer.expiresAt)
    throw new ValidationError(ERROR_MESSAGES.OFFER.EXPIRED);

  let updated: OfferDocument;

  if (action === "accept") {
    updated = await offerRepository.accept(
      offerId,
      offer.offerAmount,
      sellerNote,
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
  }

  const notifMessage =
    action === "accept"
      ? `Your offer of ₹${offer.offerAmount} on "${offer.productTitle}" was accepted! Complete checkout now.`
      : action === "decline"
        ? `Your offer on "${offer.productTitle}" was declined.`
        : `${offer.sellerName} countered with ₹${counterAmount} on "${offer.productTitle}".`;

  await notificationRepository.create({
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

// ─── Buyer: Accept counter ─────────────────────────────────────────────────

export async function acceptCounterOffer(
  userId: string,
  offerId: string,
): Promise<OfferDocument> {
  const offer = await offerRepository.findById(offerId);
  if (!offer) throw new NotFoundError("Offer not found.");
  if (offer.buyerUid !== userId)
    throw new AuthorizationError("Not authorised.");
  if (offer.status !== OfferStatusValues.COUNTERED)
    throw new ValidationError("No counter to accept.");
  if (new Date() > offer.expiresAt)
    throw new ValidationError(ERROR_MESSAGES.OFFER.EXPIRED);

  const updated = await offerRepository.acceptCounter(offerId);

  await notificationRepository.create({
    userId: offer.sellerId,
    type: "offer_counter_accepted",
    priority: "high",
    title: "Counter offer accepted",
    message: `Buyer accepted your counter of ₹${offer.counterAmount} on "${offer.productTitle}". They can now checkout.`,
    relatedId: offerId,
    relatedType: "offer",
  });

  return updated;
}

// ─── Buyer: Counter back ──────────────────────────────────────────────────

export async function counterOfferByBuyer(
  userId: string,
  userEmail: string,
  input: BuyerCounterInput,
): Promise<OfferDocument> {
  const { offerId, counterAmount, buyerNote } = input;

  const offer = await offerRepository.findById(offerId);
  if (!offer) throw new NotFoundError("Offer not found.");
  if (offer.buyerUid !== userId)
    throw new AuthorizationError("Not authorised.");
  if (offer.status !== OfferStatusValues.COUNTERED)
    throw new ValidationError(ERROR_MESSAGES.OFFER.NOT_COUNTERED);
  if (new Date() > offer.expiresAt)
    throw new ValidationError(ERROR_MESSAGES.OFFER.EXPIRED);

  const sellerCounter = offer.counterAmount!;
  const minAllowed = Math.floor(sellerCounter * 0.8);
  const maxAllowed = Math.ceil(sellerCounter * 1.2);
  if (counterAmount < minAllowed || counterAmount > maxAllowed)
    throw new ValidationError(
      `${ERROR_MESSAGES.OFFER.COUNTER_RANGE} Allowed: ₹${minAllowed}–₹${maxAllowed}.`,
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

  await offerRepository.withdraw(offerId);

  const newOffer = await offerRepository.create({
    productId: offer.productId,
    productTitle: offer.productTitle,
    productSlug: offer.productSlug,
    productImageUrl: offer.productImageUrl,
    buyerUid: userId,
    buyerName: offer.buyerName,
    buyerEmail: offer.buyerEmail,
    sellerId: offer.sellerId,
    sellerName: offer.sellerName,
    offerAmount: counterAmount,
    listedPrice: offer.listedPrice,
    currency: offer.currency,
    buyerNote,
  });

  await notificationRepository.create({
    userId: offer.sellerId,
    type: "offer_received",
    priority: "normal",
    title: "Buyer counter offer",
    message: `${offer.buyerName} countered with ₹${counterAmount} on "${offer.productTitle}".`,
    relatedId: newOffer.id,
    relatedType: "offer",
  });

  serverLogger.info("counterOfferByBuyer", {
    previousOfferId: offerId,
    newOfferId: newOffer.id,
    buyerUid: userId,
    productId: offer.productId,
    counterAmount,
  });

  return newOffer;
}

// ─── Buyer: Withdraw offer ─────────────────────────────────────────────────

export async function withdrawOffer(
  userId: string,
  offerId: string,
): Promise<void> {
  const offer = await offerRepository.findById(offerId);
  if (!offer) throw new NotFoundError("Offer not found.");
  if (offer.buyerUid !== userId)
    throw new AuthorizationError("Not authorised.");
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

// ─── Read ──────────────────────────────────────────────────────────────────

export async function listBuyerOffers(
  userId: string,
): Promise<OfferDocument[]> {
  const result = await offerRepository.findByBuyer(userId);
  return result.items;
}

export async function listSellerOffers(
  userId: string,
): Promise<OfferDocument[]> {
  const result = await offerRepository.findBySeller(userId);
  return result.items.map(maskOfferForSeller);
}

// ─── Buyer: Checkout accepted offer ────────────────────────────────────────

export async function checkoutOffer(
  userId: string,
  offerId: string,
): Promise<CartDocument> {
  const offer = await offerRepository.findById(offerId);
  if (!offer) throw new NotFoundError("Offer not found.");
  if (offer.buyerUid !== userId)
    throw new AuthorizationError("Not authorised.");
  if (offer.status !== OfferStatusValues.ACCEPTED)
    throw new ValidationError("Only accepted offers can be checked out.");
  if (!offer.lockedPrice)
    throw new ValidationError("Offer price not confirmed. Contact support.");

  const product = await productRepository.findById(offer.productId);
  if (!product) throw new NotFoundError(ERROR_MESSAGES.PRODUCT.NOT_FOUND);
  if (
    (product.availableQuantity ?? 0) <= 0 ||
    product.status === ProductStatusValues.DISCONTINUED ||
    product.status === ProductStatusValues.SOLD
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
    sellerId: offer.sellerId,
    sellerName: offer.sellerName,
    isAuction: false,
    isPreOrder: false,
    isOffer: true,
    offerId: offer.id,
    lockedPrice: offer.lockedPrice,
  });
}
