export * from "./types";
export * from "./hooks/useAdmin";
export * from "./components";
export { manifest } from "./manifest";
export { ADMIN_PAGE_PERMISSIONS } from "./permission-map";

// API route handlers — re-exported for 2-line consumer stubs
export { GET as adminProductsGET } from "./api/products/route.js";
export { GET as adminCouponsGET } from "./api/coupons/route.js";
export { GET as adminReviewsGET } from "./api/reviews/route.js";
export { GET as adminBidsGET } from "./api/bids/route.js";
