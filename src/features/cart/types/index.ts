export interface CartItemMeta {
  productId: string;
  sellerId?: string;
  title: string;
  image?: string;
  price: number;
  currency?: string;
  slug?: string;
  attributes?: Record<string, string>;
}

export interface CartItem {
  id: string;
  userId?: string;
  sessionId?: string;
  productId: string;
  quantity: number;
  meta: CartItemMeta;
  addedAt?: string;
  updatedAt?: string;
}

export interface CartData {
  items: CartItem[];
  subtotal: number;
  total: number;
  currency: string;
  itemCount: number;
}
