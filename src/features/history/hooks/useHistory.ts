"use client";
/**
 * useHistory — track + manage recently-viewed history.
 *
 * Auth users → POST/DELETE against `/api/user/history`.
 * Guest users → localStorage mirror via guest-history utils.
 *
 * Track is debounced (1.5s after mount) and session-deduped to avoid bot/
 * back-button spam.
 */
import { useCallback, useEffect, useRef, useState } from "react";
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

async function fetchAuthHistory(): Promise<GuestHistoryItem[]> {
  try {
    const res = await fetch("/api/user/history", { credentials: "include" });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: { items?: GuestHistoryItem[] };
    };
    return json.data?.items ?? [];
  } catch {
    return [];
  }
}

export function useHistory(userId: string | null | undefined): UseHistoryReturn {
  const isAuth = !!userId;
  const [items, setItems] = useState<GuestHistoryItem[]>([]);
  const trackTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (isAuth) {
        const fetched = await fetchAuthHistory();
        if (!cancelled) setItems(fetched);
      } else {
        setItems(getGuestHistory());
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [isAuth]);

  const refetch = useCallback(async () => {
    if (isAuth) {
      const fetched = await fetchAuthHistory();
      setItems(fetched);
    } else {
      setItems(getGuestHistory());
    }
  }, [isAuth]);

  const track = useCallback(
    ({ productId, productType, snapshot }: TrackArgs) => {
      if (!productId) return;
      const key = `${productType}:${productId}`;
      if (sessionTracked.has(key)) return; // session-dedup
      // Debounce
      const existing = trackTimers.current.get(key);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(async () => {
        sessionTracked.add(key);
        if (isAuth) {
          try {
            await fetch("/api/user/history", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productId, productType, snapshot }),
            });
          } catch {
            // best-effort
          }
        } else {
          trackGuestHistory(productId, productType, snapshot);
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
        try {
          await fetch(`/api/user/history/${encodeURIComponent(productId)}`, {
            method: "DELETE",
            credentials: "include",
          });
          await refetch();
        } catch {
          // ignore
        }
      } else {
        const next = removeGuestHistoryItem(productId);
        setItems(next);
      }
    },
    [isAuth, refetch],
  );

  const clear = useCallback(async () => {
    if (isAuth) {
      try {
        await fetch("/api/user/history", {
          method: "DELETE",
          credentials: "include",
        });
        setItems([]);
      } catch {
        // ignore
      }
    } else {
      clearGuestHistory();
      setItems([]);
    }
  }, [isAuth]);

  return {
    items,
    count: items.length,
    isGuest: !isAuth,
    track,
    remove,
    clear,
    refetch,
  };
}
