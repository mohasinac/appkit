export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  productTitle?: string;
  productImage?: string;
  productPrice?: number;
  productCurrency?: string;
  productSlug?: string;
  productStatus?: string;
  addedAt?: string;
}

export interface WishlistResponse {
  items: WishlistItem[];
  total: number;
}
