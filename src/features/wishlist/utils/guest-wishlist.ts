const DEFAULT_GUEST_WISHLIST_KEY = process.env.NEXT_PUBLIC_APP_ID
  ? `${process.env.NEXT_PUBLIC_APP_ID}_guest_wishlist`
  : "guest_wishlist";

export interface GuestWishlistItem {
  itemId: string;
  type: "product" | "auction" | "preorder" | "category" | "store" | "classified" | "digital-code" | "live";
  title?: string;
  image?: string;
  addedAt?: string;
}

export interface GuestWishlistStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getDefaultStorage(): GuestWishlistStorage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function readItems(
  storage: GuestWishlistStorage | null,
  key: string,
): GuestWishlistItem[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GuestWishlistItem[]) : [];
  } catch {
    return [];
  }
}

function writeItems(
  storage: GuestWishlistStorage | null,
  key: string,
  items: GuestWishlistItem[],
): void {
  if (!storage) return;
  storage.setItem(key, JSON.stringify(items));
}

export function getGuestWishlistItems(
  storage: GuestWishlistStorage | null = getDefaultStorage(),
  key = DEFAULT_GUEST_WISHLIST_KEY,
): GuestWishlistItem[] {
  return readItems(storage, key);
}

export function addToGuestWishlist(
  itemId: string,
  type: "product" | "auction" | "preorder" | "category" | "store" | "classified" | "digital-code" | "live",
  snapshot?: { title?: string; image?: string },
  storage: GuestWishlistStorage | null = getDefaultStorage(),
  key = DEFAULT_GUEST_WISHLIST_KEY,
): GuestWishlistItem[] {
  const items = readItems(storage, key);
  const existing = items.find((i) => i.itemId === itemId && i.type === type);

  if (existing) {
    // Already in wishlist, return unchanged
    return items;
  }

  const updated: GuestWishlistItem[] = [
    ...items,
    {
      itemId,
      type,
      title: snapshot?.title,
      image: snapshot?.image,
      addedAt: new Date().toISOString(),
    },
  ];

  writeItems(storage, key, updated);
  return updated;
}

export function removeFromGuestWishlist(
  itemId: string,
  type: "product" | "auction" | "preorder" | "category" | "store" | "classified" | "digital-code" | "live",
  storage: GuestWishlistStorage | null = getDefaultStorage(),
  key = DEFAULT_GUEST_WISHLIST_KEY,
): GuestWishlistItem[] {
  const updated = readItems(storage, key).filter(
    (i) => !(i.itemId === itemId && i.type === type),
  );
  writeItems(storage, key, updated);
  return updated;
}

export function isInGuestWishlist(
  itemId: string,
  type: "product" | "auction" | "preorder" | "category" | "store" | "classified" | "digital-code" | "live",
  storage: GuestWishlistStorage | null = getDefaultStorage(),
  key = DEFAULT_GUEST_WISHLIST_KEY,
): boolean {
  const items = readItems(storage, key);
  return items.some((i) => i.itemId === itemId && i.type === type);
}

export function clearGuestWishlist(
  storage: GuestWishlistStorage | null = getDefaultStorage(),
  key = DEFAULT_GUEST_WISHLIST_KEY,
): void {
  if (!storage) return;
  storage.removeItem(key);
}

export function getGuestWishlistCount(
  storage: GuestWishlistStorage | null = getDefaultStorage(),
  key = DEFAULT_GUEST_WISHLIST_KEY,
): number {
  return readItems(storage, key).length;
}

export function getGuestWishlistByType(
  type: "product" | "auction" | "preorder" | "category" | "store" | "classified" | "digital-code" | "live",
  storage: GuestWishlistStorage | null = getDefaultStorage(),
  key = DEFAULT_GUEST_WISHLIST_KEY,
): GuestWishlistItem[] {
  return readItems(storage, key).filter((i) => i.type === type);
}
