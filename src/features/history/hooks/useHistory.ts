"use client";
/**
 * useHistory — track + manage recently-viewed history.
 *
 * Auth users    → POST/DELETE against /api/user/history (Firestore-backed).
 * Guest users   → localStorage mirror via guest-history utils (same FIFO 50 cap).
 *
 * Track is debounced (TRACK_DEBOUNCE_MS) and session-deduped to avoid bot /
 * back-button spam. The deduper is module-scoped so a productId only fires once
 * per page session even across remounts.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ACCOUNT_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  type GuestHistoryItem,
  type GuestHistoryType,
  clearGuestHistory,
  getGuestHistory,
  removeGuestHistoryItem,
  trackGuestHistory,
} from "../utils/guest-history";

const TRACK_DEBOUNCE_MS = 1500;
const sessionTracked = new Set<string>();
const sessionKey = (productType: string, productId: string) =>
  `${productType}:${productId}`;

export interface TrackArgs {
  productId: string;
  productType: GuestHistoryType;
  snapshot?: GuestHistoryItem["productSnapshot"];
}

export interface UseHistoryReturn {
  items: GuestHistoryItem[];
  count: number;
  isGuest: boolean;
  track: (args: TrackArgs) => void;
  remove: (productId: string) => Promise<void>;
  clear: () => Promise<void>;
  refetch: () => Promise<void>;
}

interface HistoryFetchResponse {
  data?: { items?: GuestHistoryItem[] };
}

async function fetchAuthHistory(): Promise<GuestHistoryItem[]> {
  try {
    const res = await fetch(ACCOUNT_ENDPOINTS.HISTORY, { credentials: "include" });
    if (!res.ok) return [];
    const json = (await res.json()) as HistoryFetchResponse;
    return json.data?.items ?? [];
  } catch {
    return [];
  }
}

async function postAuthTrack(args: TrackArgs): Promise<void> {
  try {
    await fetch(ACCOUNT_ENDPOINTS.HISTORY, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
  } catch {
    // best-effort tracking
  }
}

async function deleteAuthItem(productId: string): Promise<void> {
  try {
    await fetch(ACCOUNT_ENDPOINTS.HISTORY_ITEM(productId), {
      method: "DELETE",
      credentials: "include",
    });
  } catch {
    // ignore
  }
}

async function deleteAuthAll(): Promise<void> {
  try {
    await fetch(ACCOUNT_ENDPOINTS.HISTORY, {
      method: "DELETE",
      credentials: "include",
    });
  } catch {
    // ignore
  }
}

export function useHistory(userId: string | null | undefined): UseHistoryReturn {
  const isAuth = !!userId;
  const [items, setItems] = useState<GuestHistoryItem[]>([]);
  const trackTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const loadItems = useCallback(async () => {
    if (isAuth) {
      setItems(await fetchAuthHistory());
    } else {
      setItems(getGuestHistory());
    }
  }, [isAuth]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await loadItems();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadItems]);

  // Cleanup any pending track timers on unmount so we don't fire after the
  // component goes away.
  useEffect(() => {
    const timers = trackTimers.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  const track = useCallback(
    (args: TrackArgs) => {
      const { productId, productType } = args;
      if (!productId) return;
      const key = sessionKey(productType, productId);
      if (sessionTracked.has(key)) return; // session-dedup
      const existing = trackTimers.current.get(key);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        sessionTracked.add(key);
        trackTimers.current.delete(key);
        if (isAuth) {
          void postAuthTrack(args);
        } else {
          trackGuestHistory(productId, productType, args.snapshot);
          setItems(getGuestHistory());
        }
      }, TRACK_DEBOUNCE_MS);
      trackTimers.current.set(key, timer);
    },
    [isAuth],
  );

  const remove = useCallback(
    async (productId: string) => {
      if (isAuth) {
        await deleteAuthItem(productId);
        await loadItems();
      } else {
        setItems(removeGuestHistoryItem(productId));
      }
    },
    [isAuth, loadItems],
  );

  const clear = useCallback(async () => {
    if (isAuth) {
      await deleteAuthAll();
    } else {
      clearGuestHistory();
    }
    setItems([]);
  }, [isAuth]);

  return {
    items,
    count: items.length,
    isGuest: !isAuth,
    track,
    remove,
    clear,
    refetch: loadItems,
  };
}
