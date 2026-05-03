import type { Permission } from "../../security";

/** Required permission for each store management route path */
export const STORE_PAGE_PERMISSIONS: Record<string, Permission> = {
  "/store": "seller:access",
  "/store/dashboard": "seller:analytics",
  "/store/products": "seller:products:read",
  "/store/products/new": "seller:products:write",
  "/store/products/[id]": "seller:products:write",
  "/store/orders": "seller:orders:read",
  "/store/orders/[id]": "seller:orders:read",
  "/store/analytics": "seller:analytics",
  "/store/coupons": "seller:coupons",
  "/store/storefront": "seller:store",
  "/store/payouts": "seller:payouts:read",
  "/store/shipping": "seller:shipping",
};

/** @deprecated Use STORE_PAGE_PERMISSIONS */
export const SELLER_PAGE_PERMISSIONS = STORE_PAGE_PERMISSIONS;
