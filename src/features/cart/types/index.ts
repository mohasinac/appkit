export interface CartItemMeta {
  productId: string;
  storeId?: string;
  /**
   * The seller's display name, for grouping lines by seller and for the cart's
   * own search box.
   *
   * 🛑 It lives here and NOT in `attributes`, which is rendered verbatim.
   * `CartItemRow` prints every attribute entry as `` `${key}: ${value}` ``, so
   * putting the store name in that bag printed the literal string
   * `storeName: Beyblade Arena` under the product title on `/cart` — a field
   * name shown to a buyer on the highest-intent page in the funnel, one line
   * below the same value already rendered properly as `SOLD BY BEYBLADE ARENA`.
   */
  storeName?: string;
  title: string;
  image?: string;
  price: number;
  currency?: string;
  slug?: string;
  /**
   * Genuine per-line product attributes — the kind a buyer needs in order to
   * tell two lines of the same product apart (size, colour, edition).
   *
   * 🛑 DISPLAY ONLY. Every entry is rendered to the buyer as
   * `` `${key}: ${value}` ``, joined with commas. Never use this to carry
   * plumbing a component needs: a field put here to be *read* is also a field
   * printed with its own name, and the leak looks like a debug string rather
   * than like a bug. Add a named field to this interface instead.
   */
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
