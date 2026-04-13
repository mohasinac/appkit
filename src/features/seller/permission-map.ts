// appkit/src/features/seller/permission-map.ts
import type { Permission } from "../../security";

/** Required permission for each seller route path */
export const SELLER_PAGE_PERMISSIONS: Record<string, Permission> = {
  "/seller": "seller:access",
  "/seller/dashboard": "seller:analytics",
  "/seller/products": "seller:products:read",
  "/seller/products/new": "seller:products:write",
  "/seller/products/[id]": "seller:products:write",
  "/seller/orders": "seller:orders:read",
  "/seller/orders/[id]": "seller:orders:read",
  "/seller/analytics": "seller:analytics",
  "/seller/coupons": "seller:coupons",
  "/seller/store": "seller:store",
  "/seller/payouts": "seller:payouts:read",
  "/seller/shipping": "seller:shipping",
};
