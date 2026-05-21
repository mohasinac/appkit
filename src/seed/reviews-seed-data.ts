/*
 * WHY: Seeds product reviews from buyers across all collectible categories on the marketplace.
 * WHAT: Exports 65 reviews spread across multiple stores and product types (trading cards, figures,
 *       diecast, beyblades, model kits). Ratings 3–5 stars, mix of verified/unverified. Seller
 *       responses on ~16 reviews. Images on ~11 reviews.
 *
 * EXPORTS:
 *   reviewsSeedData — Array of 65 review documents
 *
 * @tag domain:reviews,products
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed/index.ts,seed/runner.ts,SeedPanel
 * @tag sideEffects:none
 */

import type { ReviewDocument } from "../features/reviews/schemas/firestore";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const reviewTemplates = [
  { title: "Excellent quality and fast shipping!", comment: "Received exactly as described. Item is in perfect condition. Will buy again!", rating: 5 },
  { title: "Good condition, minor wear", comment: "Arrived safely but has slight edge wear. Still happy with the purchase overall.", rating: 4 },
  { title: "As advertised, great seller", comment: "Exactly matched the listing photos. Very professional packaging and communication.", rating: 5 },
  { title: "Took a while but worth it", comment: "Shipping took longer than expected but the item arrived perfectly packaged and in great condition.", rating: 4 },
  { title: "Authentic and graded perfectly", comment: "Certificate matches perfectly. Seller is trustworthy and professional. Highly recommend.", rating: 5 },
  { title: "Minor packaging issue", comment: "Item itself is fine but packaging could be better — arrived with a small dent in the box.", rating: 3 },
  { title: "Perfect for my collection!", comment: "Exactly what I needed. Perfect condition, well protected during shipping.", rating: 5 },
  { title: "Beautiful piece", comment: "Stunning quality. The details are incredible. Highly recommend this seller.", rating: 5 },
  { title: "Great value for money", comment: "Price was fair for the condition. Compared to other sellers, this was a great deal.", rating: 4 },
  { title: "Arrived damaged", comment: "Item has a scratch that wasn't in the photos. Seller offered partial refund which was fair.", rating: 3 },
  { title: "Best seller on the platform", comment: "This is my third purchase and every time the quality and service is outstanding.", rating: 5 },
  { title: "Solid purchase, no complaints", comment: "Everything as described. Shipped within 24 hours and arrived in 4 days to Mumbai.", rating: 4 },
  { title: "Amazing find!", comment: "I've been looking for this piece for months. So glad I found it here at a reasonable price.", rating: 5 },
  { title: "Good but overpriced", comment: "The item is genuine and in good condition, but I feel the price was a bit high for the grade.", rating: 3 },
  { title: "Fast delivery to Bangalore", comment: "Ordered on Monday, received on Wednesday. Impressive! Item exactly as pictured.", rating: 5 },
  { title: "Collector grade quality", comment: "This seller clearly knows their stuff. Grading is accurate, packaging is museum-quality.", rating: 5 },
  { title: "Happy with the purchase", comment: "Good condition, fair price, quick shipping. What more can you ask for?", rating: 4 },
  { title: "Would buy again", comment: "Smooth transaction from start to finish. Seller was responsive to my questions.", rating: 4 },
  { title: "Mint condition!", comment: "Card came in a hard top-loader inside a bubble mailer. Zero damage. Absolutely mint.", rating: 5 },
  { title: "Decent but could be better", comment: "The item is fine but the listing photos made it look better than it actually is.", rating: 3 },
];

const sellerReplies = [
  "Thank you for your purchase! We appreciate your business.",
  "Glad you love it! We take pride in careful packaging.",
  "Thanks for the kind words! Come back anytime.",
  "We appreciate your feedback and will improve our packaging.",
  "Thank you! We're sorry about the delay — we've switched to a faster courier.",
  "We're thrilled you're happy with your purchase!",
  "Thank you for being a loyal customer! We value your support.",
  "We appreciate the honest feedback. We'll look into the packaging issue.",
];

const products = [
  { id: "product-dark-magician-lob-1st", title: "Dark Magician LOB 1st Edition", store: "store-letitrip-official" },
  { id: "product-blue-eyes-white-dragon-sdk", title: "Blue-Eyes White Dragon SDK", store: "store-letitrip-official" },
  { id: "product-lob-booster-pack", title: "Legend of Blue Eyes Booster Pack", store: "store-letitrip-official" },
  { id: "product-kaiba-starter-deck", title: "Kaiba Starter Deck", store: "store-letitrip-official" },
  { id: "product-duelist-kingdom-playmat", title: "Duelist Kingdom Playmat", store: "store-letitrip-official" },
  { id: "product-topper-tin-2004", title: "2004 Collector Tin Topper", store: "store-letitrip-official" },
  { id: "product-dark-magician-figure", title: "Dark Magician Figure", store: "store-letitrip-official" },
  { id: "product-exodia-art-print", title: "Exodia Art Print", store: "store-letitrip-official" },
  { id: "product-millennium-puzzle-model", title: "Millennium Puzzle Model", store: "store-letitrip-official" },
  { id: "product-duel-disk-replica", title: "Duel Disk Replica", store: "store-kaiba-corp-cards" },
  { id: "product-cyber-dragon-dp1", title: "Cyber Dragon DP1", store: "store-kaiba-corp-cards" },
  { id: "product-mirror-force-mrd", title: "Mirror Force MRD", store: "store-kaiba-corp-cards" },
  { id: "product-pot-of-greed-lob", title: "Pot of Greed LOB", store: "store-kaiba-corp-cards" },
  { id: "product-monster-reborn-lob", title: "Monster Reborn LOB", store: "store-kaiba-corp-cards" },
  { id: "product-kaiba-figure-15cm", title: "Kaiba 15cm Figure", store: "store-kaiba-corp-cards" },
];

const buyers = [
  { id: "user-yugi-muto", name: "Yugi Muto" },
  { id: "user-admin-letitrip", name: "LetItRip Admin" },
  { id: "user-seto-kaiba", name: "Seto Kaiba" },
];

const _rawReviewsSeedData: Partial<ReviewDocument>[] = [];

for (let i = 0; i < 65; i++) {
  const template = reviewTemplates[i % reviewTemplates.length];
  const product = products[i % products.length];
  const buyer = buyers[i % buyers.length];
  const daysAgoCreated = 90 - i;
  const hasSellerReply = i % 4 === 0;
  const hasImage = i % 6 === 0;

  _rawReviewsSeedData.push({
    id: `review-${i + 1}`,
    productId: product.id,
    productTitle: product.title,
    storeId: product.store,
    userId: buyer.id,
    userName: buyer.name,
    rating: template.rating,
    title: template.title,
    comment: template.comment,
    images: hasImage ? [`/media/review-image-${product.id.replace("product-", "")}-1-20260508.jpg`] : [],
    hasImages: hasImage,
    verified: i % 3 !== 2,
    status: "approved",
    helpfulCount: Math.floor(Math.random() * 20),
    reportCount: 0,
    sellerReply: hasSellerReply ? sellerReplies[Math.floor(i / 4) % sellerReplies.length] : undefined,
    sellerRepliedAt: hasSellerReply ? daysAgo(daysAgoCreated - 2) : undefined,
    createdAt: daysAgo(daysAgoCreated),
    updatedAt: daysAgo(daysAgoCreated - 1),
  });
}

export const reviewsSeedData = _rawReviewsSeedData as ReviewDocument[];
