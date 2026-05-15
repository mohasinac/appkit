import type { MediaField } from "../../media/types/index";

export interface PreorderItem {
  id: string;
  name: string;
  slug: string;
  images: string[];
  media?: MediaField[];
  salePrice: number;
  regularPrice: number;
  franchise: string;
  brand: string;
  description: string;
  preorderShipDate?: string;
  isFeatured: boolean;
  active: boolean;
  /** Order lifecycle status (from feat-pre-orders) */
  status?: PreOrderStatus;
  /** Admin note for status updates */
  adminNote?: string;
  /** Reverse refs — bundle IDs that include this pre-order. */
  partOfBundleIds?: string[];
  /** Parallel titles for partOfBundleIds. */
  partOfBundleTitles?: string[];
  /** Feature badge IDs opted into by this listing. */
  featureIds?: string[];
  /** Links to a sublisting category — signals "has variants". */
  sublistingCategoryId?: string;
  /** Curated set/group membership. */
  groupId?: string;
  isGroupParent?: boolean;
  groupTitle?: string;
  createdAt: string;
  updatedAt: string;
}

/** Shipping/availability status for preorder items (from feat-preorders) */
export type PreorderStatus = "available" | "shipping_soon" | "shipped";
/** Order lifecycle status (from feat-pre-orders) */
export type PreOrderStatus =
  | "pending"
  | "confirmed"
  | "ready"
  | "fulfilled"
  | "cancelled";
/** @alias PreorderItem — compatibility with feat-pre-orders naming */
export type PreOrderItem = PreorderItem;

export function getPreorderStatus(
  shipDate: string | undefined,
): PreorderStatus {
  if (!shipDate) return "available";
  const ship = new Date(shipDate);
  const now = new Date();
  const diffDays = Math.ceil(
    (ship.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays <= 0) return "shipped";
  if (diffDays <= 14) return "shipping_soon";
  return "available";
}
