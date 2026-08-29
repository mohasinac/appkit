/**
 * @mohasinac/appkit/features/admin/server
 *
 * Server-only entry point for admin API route handlers.
 */
export * from "./actions";

export { notificationRepository } from "./repository/notification.repository";
export { contactSubmissionsRepository } from "../../core/contact-submissions.repository";
export { siteSettingsRepository } from "./repository/site-settings.repository";

export { GET as adminProductsGET } from "./api/products/route";
export { GET as adminCouponsGET } from "./api/coupons/route";
export { GET as adminReviewsGET } from "./api/reviews/route";
export { GET as adminBidsGET } from "./api/bids/route";
