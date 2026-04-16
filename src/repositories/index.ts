/**
 * Repositories
 *
 * Canonical repository entrypoint for consumer apps.
 */

// Shared repository foundations
export { BaseRepository } from "../providers/db-firebase";

// Unit of Work - atomic multi-collection operations
export { unitOfWork } from "../core";
export type { UnitOfWork } from "../core";

// Core repositories
export {
  UserRepository,
  userRepository,
  EmailVerificationTokenRepository,
  PasswordResetTokenRepository,
  emailVerificationTokenRepository,
  passwordResetTokenRepository,
  tokenRepository,
  SessionRepository,
  sessionRepository,
} from "../features/auth";
export { AddressRepository, addressRepository } from "../features/account";
export {
  ProductRepository,
  ProductsRepository,
  productRepository,
} from "../features/products";
export {
  OrderRepository,
  OrdersRepository,
  orderRepository,
} from "../features/orders";
export {
  ReviewRepository,
  ReviewsRepository,
  reviewRepository,
} from "../features/reviews";

// Canonical appkit-owned repositories
export { bidRepository } from "../features/auctions";
export { CartRepository, cartRepository } from "../features/cart";
export {
  StoreRepository,
  storeRepository,
  storeAddressRepository,
} from "../features/stores";
export {
  siteSettingsRepository,
  notificationRepository,
  chatRepository,
} from "../features/admin";
export {
  carouselRepository,
  homepageSectionsRepository,
} from "../features/homepage";
export {
  CategoriesRepository,
  categoriesRepository,
} from "../features/categories";
export { couponsRepository } from "../features/promotions";
export {
  FAQsRepository,
  FirebaseFAQsRepository,
  faqsRepository,
} from "../features/faq";
export { BlogRepository, blogRepository } from "../features/blog";
export { payoutRepository } from "../features/payments";
export { OfferRepository, offerRepository } from "../features/seller";

export {
  wishlistRepository,
  type UserWishlistItem as WishlistItem,
} from "../features/wishlist";

// Feature repositories already appkit-owned
export {
  EventRepository,
  EventsRepository,
  eventRepository,
  EventEntryRepository,
  EventEntriesRepository,
  eventEntryRepository,
} from "../features/events";
export {
  NewsletterRepository,
  newsletterRepository,
} from "../core/newsletter.repository";
export type {
  NewsletterSubscriberDocument,
  NewsletterSubscriberCreateInput,
  NewsletterSubscriberUpdateInput,
  NewsletterListModel,
} from "../core/newsletter.repository";

export { SmsCounterRepository, smsCounterRepository } from "../features/auth";

export { CopilotLogRepository, copilotLogRepository } from "../core";
export type {
  CopilotFeedback,
  CopilotLogDocument,
  CopilotLogCreateInput,
} from "../core";
