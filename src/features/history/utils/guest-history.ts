/**
 * Guest history — localStorage mirror of the user history doc.
 *
 * Same shape as UserHistoryItem (minus userId). 50-item FIFO cap.
 * Re-visit semantics mirror server: remove existing entry for productId,
 * unshift new entry at position 0, then slice to HISTORY_MAX.
 */
import { HISTORY_MAX } from "../../../constants/limits";

const DEFAULT_GUEST_HISTORY_KEY = process.env.NEXT_PUBLIC_APP_ID
  ? `${process.env.NEXT_PUBLIC_APP_ID}_guest_history`
  : "guest_history";

export type GuestHistoryType = "product" | "auction" | "preorder";

export interface GuestHistoryItem {
  productId: string;
  productType: GuestHistoryType;
  viewedAt: string;
  productSnapshot?: {
    title?: string;
    thumb?: string;
    price?: number;
    storeId?: string;
    storeName?: string;
  };
}

interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getDefaultStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function read(storage: Storage | null, key: string): GuestHistoryItem[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GuestHistoryItem[]) : [];
  } catch {
    return [];
  }
}

function write(storage: Storage | null, key: string, items: GuestHistoryItem[]): void {
  if (!storage) return;
  storage.setItem(key, JSON.stringify(items));
}

export function getGuestHistory(
  storage: Storage | null = getDefaultStorage(),
  key = DEFAULT_GUEST_HISTORY_KEY,
): GuestHistoryItem[] {
  return read(storage, key);
}

export function trackGuestHistory(
  productId: string,
  productType: GuestHistoryType,
  snapshot?: GuestHistoryItem["productSnapshot"],
  storage: Storage | null = getDefaultStorage(),
  key = DEFAULT_GUEST_HISTORY_KEY,
): GuestHistoryItem[] {
  const items = read(storage, key);
  const filtered = items.filter((i) => i.productId !== productId);
  const next: GuestHistoryItem[] = [
    {
      productId,
      productType,
      viewedAt: new Date().toISOString(),
      productSnapshot: snapshot,
    },
    ...filtered,
  ].slice(0, HISTORY_MAX);
  write(storage, key, next);
  return next;
}

export function removeGuestHistoryItem(
  productId: string,
  storage: Storage | null = getDefaultStorage(),
  key = DEFAULT_GUEST_HISTORY_KEY,
): GuestHistoryItem[] {
  const next = read(storage, key).filter((i) => i.productId !== productId);
  write(storage, key, next);
  return next;
}

export function clearGuestHistory(
  storage: Storage | null = getDefaultStorage(),
  key = DEFAULT_GUEST_HISTORY_KEY,
): void {
  if (!storage) return;
  storage.removeItem(key);
}

export function getGuestHistoryCount(
  storage: Storage | null = getDefaultStorage(),
  key = DEFAULT_GUEST_HISTORY_KEY,
): number {
  return read(storage, key).length;
}
