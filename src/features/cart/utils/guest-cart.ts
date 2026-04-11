const DEFAULT_GUEST_CART_KEY = process.env.NEXT_PUBLIC_APP_ID
  ? `${process.env.NEXT_PUBLIC_APP_ID}_guest_cart`
  : "guest_cart";
const DEFAULT_GUEST_RETURN_TO_KEY = process.env.NEXT_PUBLIC_APP_ID
  ? `${process.env.NEXT_PUBLIC_APP_ID}_guest_return_to`
  : "guest_return_to";

export interface GuestCartItem {
  productId: string;
  quantity: number;
  productTitle?: string;
  productImage?: string;
  price?: number;
}

export interface GuestCartStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getDefaultStorage(): GuestCartStorage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function readItems(
  storage: GuestCartStorage | null,
  key: string,
): GuestCartItem[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GuestCartItem[]) : [];
  } catch {
    return [];
  }
}

function writeItems(
  storage: GuestCartStorage | null,
  key: string,
  items: GuestCartItem[],
): void {
  if (!storage) return;
  storage.setItem(key, JSON.stringify(items));
}

export function getGuestCartItems(
  storage: GuestCartStorage | null = getDefaultStorage(),
  key = DEFAULT_GUEST_CART_KEY,
): GuestCartItem[] {
  return readItems(storage, key);
}

export function addToGuestCart(
  productId: string,
  quantity: number,
  snapshot?: { productTitle?: string; productImage?: string; price?: number },
  storage: GuestCartStorage | null = getDefaultStorage(),
  key = DEFAULT_GUEST_CART_KEY,
): GuestCartItem[] {
  const items = readItems(storage, key);
  const existing = items.find((i) => i.productId === productId);
  const updated: GuestCartItem[] = existing
    ? items.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.min(i.quantity + quantity, 99) }
          : i,
      )
    : [...items, { productId, quantity, ...snapshot }];

  writeItems(storage, key, updated);
  return updated;
}

export function removeFromGuestCart(
  productId: string,
  storage: GuestCartStorage | null = getDefaultStorage(),
  key = DEFAULT_GUEST_CART_KEY,
): GuestCartItem[] {
  const updated = readItems(storage, key).filter(
    (i) => i.productId !== productId,
  );
  writeItems(storage, key, updated);
  return updated;
}

export function updateGuestCartQuantity(
  productId: string,
  quantity: number,
  storage: GuestCartStorage | null = getDefaultStorage(),
  key = DEFAULT_GUEST_CART_KEY,
): GuestCartItem[] {
  const items = readItems(storage, key);
  const updated =
    quantity <= 0
      ? items.filter((i) => i.productId !== productId)
      : items.map((i) =>
          i.productId === productId
            ? { ...i, quantity: Math.min(quantity, 99) }
            : i,
        );

  writeItems(storage, key, updated);
  return updated;
}

export function clearGuestCart(
  storage: GuestCartStorage | null = getDefaultStorage(),
  key = DEFAULT_GUEST_CART_KEY,
): void {
  if (!storage) return;
  storage.removeItem(key);
}

export function getGuestCartCount(
  storage: GuestCartStorage | null = getDefaultStorage(),
  key = DEFAULT_GUEST_CART_KEY,
): number {
  return readItems(storage, key).reduce((sum, i) => sum + i.quantity, 0);
}

export function setGuestReturnTo(
  url: string,
  storage: GuestCartStorage | null = getDefaultStorage(),
  key = DEFAULT_GUEST_RETURN_TO_KEY,
): void {
  if (!storage) return;
  storage.setItem(key, url);
}

export function getGuestReturnTo(
  storage: GuestCartStorage | null = getDefaultStorage(),
  key = DEFAULT_GUEST_RETURN_TO_KEY,
): string | null {
  if (!storage) return null;
  return storage.getItem(key);
}

export function clearGuestReturnTo(
  storage: GuestCartStorage | null = getDefaultStorage(),
  key = DEFAULT_GUEST_RETURN_TO_KEY,
): void {
  if (!storage) return;
  storage.removeItem(key);
}
