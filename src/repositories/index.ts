/**
 * Repositories
 *
 * Canonical repository entrypoint for consumer apps.
 * Server-only — all repository instances use firebase-admin.
 */
import "server-only";

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
} from "../features/auth/repository";
export {
  SmsCounterRepository,
  smsCounterRepository,
} from "../features/auth/repository/sms-counter.repository";
export {
  AddressRepository,
  addressRepository,
} from "../features/account/repository/address.repository";
export {
  ProductRepository,
  ProductsRepository,
  productRepository,
} from "../features/products/repository/products.repository";
export {
  OrderRepository,
  OrdersRepository,
  orderRepository,
} from "../features/orders/repository/orders.repository";
export {
  ReviewRepository,
  ReviewsRepository,
  reviewRepository,
} from "../features/reviews/repository/reviews.repository";

// Canonical appkit-owned repositories
export { bidRepository } from "../features/auctions/repository/bid.repository";
export {
  CartRepository,
  cartRepository,
} from "../features/cart/repository/cart.repository";
export {
  StoreRepository,
  storeRepository,
} from "../features/stores/repository/store.repository";
export { storeAddressRepository } from "../features/stores/repository/store-address.repository";
export { siteSettingsRepository } from "../features/admin/repository/site-settings.repository";
export { notificationRepository } from "../features/admin/repository/notification.repository";
export { chatRepository } from "../features/admin/repository/chat.repository";
export { carouselRepository } from "../features/homepage/repository/carousel.repository";
export { homepageSectionsRepository } from "../features/homepage/repository/homepage-sections.repository";
export {
  CategoriesRepository,
  categoriesRepository,
} from "../features/categories/repository/categories.repository";
export { couponsRepository } from "../features/promotions/repository/coupons.repository";
export {
  FAQsRepository,
  FirebaseFAQsRepository,
  faqsRepository,
} from "../features/faq/repository/faqs.repository";
export {
  BlogRepository,
  blogRepository,
} from "../features/blog/repository/blog.repository";
export { payoutRepository } from "../features/payments/repository/payout.repository";
export {
  OfferRepository,
  offerRepository,
} from "../features/seller/repository/offer.repository";

export {
  wishlistRepository,
  type UserWishlistItem as WishlistItem,
} from "../features/wishlist/repository/user-wishlist.repository";

// Feature repositories already appkit-owned
export {
  EventRepository,
  EventsRepository,
  eventRepository,
} from "../features/events/repository/events.repository";
export {
  EventEntryRepository,
  EventEntriesRepository,
  eventEntryRepository,
} from "../features/events/repository/event-entry.repository";
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

export { CopilotLogRepository, copilotLogRepository } from "../core";
export type {
  CopilotFeedback,
  CopilotLogDocument,
  CopilotLogCreateInput,
} from "../core";
