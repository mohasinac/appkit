// appkit/src/seed/index.ts
export type { SeedCollection, SeedConfig, SeedResult } from "./types";
export { runSeed } from "./runner";

// Factories — user
export type { SeedBaseUserDocument } from "./factories/user.factory";
export {
  makeUser,
  makeFullUser,
  USER_FIXTURES,
} from "./factories/user.factory";

// Factories — product
export type { SeedBaseProductDocument } from "./factories/product.factory";
export {
  makeProduct,
  makeFullProduct,
  PRODUCT_FIXTURES,
} from "./factories/product.factory";

// Factories — store
export type { SeedBaseStoreDocument } from "./factories/store.factory";
export {
  makeStore,
  makeFullStore,
  STORE_FIXTURES,
} from "./factories/store.factory";

// Factories — order
export type {
  SeedBaseOrderDocument,
  SeedBaseOrderItem,
} from "./factories/order.factory";
export { makeOrder } from "./factories/order.factory";

// Factories — review
export type { SeedReviewDocument } from "./factories/review.factory";
export { makeReview } from "./factories/review.factory";

// Factories — blog
export type { SeedBlogPostDocument } from "./factories/blog-post.factory";
export { makeBlogPost } from "./factories/blog-post.factory";

// Factories — faq
export type { SeedFaqDocument } from "./factories/faq.factory";
export { makeFaq } from "./factories/faq.factory";

// Factories — category
export type { SeedCategoryDocument } from "./factories/category.factory";
export { makeCategory } from "./factories/category.factory";

// Factories — carousel
export type { SeedCarouselSlideDocument } from "./factories/carousel.factory";
export { makeCarouselSlide } from "./factories/carousel.factory";

// Factories — homepage
export type {
  SeedHomepageSectionDocument,
  HomepageSectionType,
} from "./factories/homepage-section.factory";
export { makeHomepageSection } from "./factories/homepage-section.factory";

// Factories — address
export type { SeedAddressDocument } from "./factories/address.factory";
export {
  makeAddress,
  makeFullAddress,
  ADDRESS_FIXTURES,
} from "./factories/address.factory";

// Factories — cart
export type {
  SeedCartDocument,
  SeedCartItemDocument,
} from "./factories/cart.factory";
export {
  makeCart,
  makeCartItem,
  makeFullCart,
  CART_FIXTURES,
} from "./factories/cart.factory";

// Factories — bid
export type { SeedBidDocument } from "./factories/bid.factory";
export { makeBid, makeWinningBid, BID_FIXTURES } from "./factories/bid.factory";

// Factories — notification
export type {
  SeedNotificationDocument,
  NotificationType,
} from "./factories/notification.factory";
export {
  makeNotification,
  makeFullNotification,
  NOTIFICATION_FIXTURES,
} from "./factories/notification.factory";

// Factories — session
export type { SeedSessionDocument } from "./factories/session.factory";
export {
  makeSession,
  makeRevokedSession,
  SESSION_FIXTURES,
} from "./factories/session.factory";

// Factories — coupon
export type {
  SeedCouponDocument,
  CouponDiscountType,
} from "./factories/coupon.factory";
export {
  makeCoupon,
  makeFullCoupon,
  COUPON_FIXTURES,
} from "./factories/coupon.factory";

// Factories — payout
export type {
  SeedPayoutDocument,
  PayoutStatus,
} from "./factories/payout.factory";
export {
  makePayout,
  makeFullPayout,
  PAYOUT_FIXTURES,
} from "./factories/payout.factory";

// Defaults
export { DEFAULT_CATEGORIES } from "./defaults/categories";
export { DEFAULT_FAQS } from "./defaults/faqs";
export { DEFAULT_HOMEPAGE_SECTIONS } from "./defaults/homepage-sections";

// Migrated seed datasets from consumer repositories
export { usersSeedData } from "./users-seed-data";
export { sessionsSeedData, SESSION_COLLECTION } from "./sessions-seed-data";
export { addressesSeedData } from "./addresses-seed-data";
export { storesSeedData } from "./stores-seed-data";
export { storeAddressesSeedData } from "./store-addresses-seed-data";
export { categoriesSeedData } from "./categories-seed-data";
export { productsSeedData } from "./products-seed-data";
export { ordersSeedData } from "./orders-seed-data";
export { reviewsSeedData } from "./reviews-seed-data";
export { cartsSeedData } from "./cart-seed-data";
export { bidsSeedData } from "./bids-seed-data";
export { couponsSeedData } from "./coupons-seed-data";
export { eventsSeedData, eventEntriesSeedData } from "./events-seed-data";
export { payoutsSeedData } from "./payouts-seed-data";
export { notificationsSeedData } from "./notifications-seed-data";
export { blogPostsSeedData } from "./blog-posts-seed-data";
export { faqSeedData } from "./faq-seed-data";
export { homepageSectionsSeedData } from "./homepage-sections-seed-data";
export { siteSettingsSeedData } from "./site-settings-seed-data";
export { carouselSlidesSeedData } from "./carousel-slides-seed-data";

// Firestore index helpers
export type { FirestoreIndexConfig } from "./firestore-indexes";
export {
  mergeFirestoreIndices,
  generateMergedFirestoreIndexFile,
} from "./firestore-indexes";

// Test utilities (Firestore emulator + PII assertion)
export { assertPiiRoundTrip, seedForTest } from "./test-utils";
export type { TestSeedHandles } from "./test-utils";
