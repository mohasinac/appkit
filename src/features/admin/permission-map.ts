// appkit/src/features/admin/permission-map.ts
import type { Permission } from "../../security";

/** Required permission for each admin route path */
export const ADMIN_PAGE_PERMISSIONS: Record<string, Permission> = {
  "/admin": "admin:access",
  "/admin/dashboard": "admin:analytics",
  "/admin/users": "admin:users",
  "/admin/orders": "admin:orders",
  "/admin/products": "admin:products",
  "/admin/reviews": "admin:reviews",
  "/admin/payouts": "admin:payouts",
  "/admin/kyc": "admin:kyc",
  "/admin/analytics": "admin:analytics",
  "/admin/activity": "admin:activity",
  "/admin/sessions": "admin:sessions",
  "/admin/newsletter": "admin:newsletter",
  "/admin/search": "admin:search",
  "/admin/feature-flags": "admin:feature-flags",
  "/admin/site-settings": "admin:settings",
  "/admin/navigation": "admin:cms:navigation",
  "/admin/cms": "admin:cms",
  "/admin/carousel": "admin:cms",
  "/admin/homepage-sections": "admin:cms",
  "/admin/copilot": "admin:settings",
  "/admin/reports": "admin:analytics",
};
