"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeError } from "../../../errors/normalize";
import { STORAGE_KEYS } from "../../../constants/storage-keys";
import { useCurrentProfile, useUpdateCurrentProfile } from "../../account/hooks/useProfile";
import {
  cardFromLegacyEntry,
  type CardElement,
  type DashboardCard,
  type RecentEntry,
} from "../../../_internal/shared/features/dashboard/recent-entry";

const PERSIST_DEBOUNCE_MS = 600;

/**
 * Per-user, user-CURATED dashboard-landing cards (Phase 9-ii, overhaul
 * brief, § "Two tiers"). The second, UNCAPPED tier beside
 * `useRecentlyVisited`'s capped-10 FIFO list — "saving these cards so
 * they're kept even if the history goes above 10" was the owner's own
 * reason for a second field rather than a flag on the first.
 *
 * Same localStorage-mirror + debounced-profile-persist shape as
 * `useRecentlyVisited`/`useHiddenHubCards`, copy-adapted per those hooks'
 * own stated norm — this field has its own identity (`DashboardCard.id`,
 * not an entry-kind dedupe key) and no eviction rule at all.
 */

function readLocalSaved(scope: string): DashboardCard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.savedCards);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, DashboardCard[]>;
    const cards = parsed?.[scope];
    return Array.isArray(cards) ? cards : [];
  } catch (err) {
    void normalizeError(err);
    return [];
  }
}

function writeLocalSaved(scope: string, cards: DashboardCard[]): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.savedCards);
    const all = raw ? (JSON.parse(raw) as Record<string, DashboardCard[]>) : {};
    all[scope] = cards;
    window.localStorage.setItem(STORAGE_KEYS.savedCards, JSON.stringify(all));
  } catch (err) {
    // audit-silent-degrade-ok: same reasoning as useRecentlyVisited — the
    // debounced profile mutation below is the durable copy; a failed local
    // mirror write only costs the no-flash fast path on this one device.
    void normalizeError(err);
  }
}

function genCardId(): string {
  // Timestamp + a short random suffix — unique enough for a per-user,
  // client-authored id with no server round-trip to mint one. Not a
  // security-sensitive identifier (scoped to this user's own uiPreferences).
  return `card-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface UseSavedCardsResult {
  /** User-curated order, uncapped. */
  items: DashboardCard[];
  /**
   * Promote a `RecentEntry` (from `useRecentlyVisited`) into a saved card —
   * the "Save" action on a recent-entry card. A no-op if a card with the
   * same derived id is already saved.
   */
  saveFromRecent: (entry: RecentEntry) => void;
  /** Start a new, empty card the composition UI (9H) fills in. */
  createCard: (initial?: { title?: string; color?: string; elements?: CardElement[] }) => string;
  /** Remove a saved card entirely. */
  removeCard: (id: string) => void;
  /** Patch one saved card's title/color/elements in place. */
  updateCard: (id: string, patch: Partial<Pick<DashboardCard, "title" | "color" | "elements">>) => void;
}

/** `scope`: `"{portal}:hub"`, e.g. `"admin:hub"` — same namespacing as `useRecentlyVisited`. */
export function useSavedCards(scope: string): UseSavedCardsResult {
  const { data: profile } = useCurrentProfile();
  const updateProfile = useUpdateCurrentProfile();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // SSR-safe: starts `null` on both server and the client's first paint,
  // same fix as `useRecentlyVisited` (see that file's own comment for the
  // hydration-mismatch mechanism this avoids) — localStorage is read in the
  // effect below, post-mount only.
  const [localItems, setLocalItems] = useState<DashboardCard[] | null>(null);

  useEffect(() => {
    const local = readLocalSaved(scope);
    if (local.length > 0) setLocalItems(local);
  }, [scope]);

  useEffect(() => {
    const stored = profile?.uiPreferences?.savedCards?.[scope];
    if (stored) setLocalItems(stored);
  }, [profile, scope]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const persist = useCallback(
    (next: DashboardCard[]) => {
      writeLocalSaved(scope, next);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateProfile.mutate({
          uiPreferences: { savedCards: { [scope]: next } },
        });
      }, PERSIST_DEBOUNCE_MS);
    },
    [scope, updateProfile],
  );

  const items = useMemo(() => localItems ?? [], [localItems]);

  const saveFromRecent = useCallback(
    (entry: RecentEntry) => {
      setLocalItems((prev) => {
        const current = prev ?? items;
        const card = { ...cardFromLegacyEntry(entry), saved: true };
        if (current.some((c) => c.id === card.id)) return current;
        const next = [card, ...current];
        persist(next);
        return next;
      });
    },
    [items, persist],
  );

  const createCard = useCallback(
    (initial?: { title?: string; color?: string; elements?: CardElement[] }): string => {
      const id = genCardId();
      const now = new Date().toISOString();
      setLocalItems((prev) => {
        const current = prev ?? items;
        const card: DashboardCard = {
          id,
          title: initial?.title,
          color: initial?.color,
          elements: initial?.elements ?? [],
          saved: true,
          createdAt: now,
          updatedAt: now,
        };
        const next = [card, ...current];
        persist(next);
        return next;
      });
      return id;
    },
    [items, persist],
  );

  const removeCard = useCallback(
    (id: string) => {
      setLocalItems((prev) => {
        const current = prev ?? items;
        const next = current.filter((c) => c.id !== id);
        persist(next);
        return next;
      });
    },
    [items, persist],
  );

  const updateCard = useCallback(
    (id: string, patch: Partial<Pick<DashboardCard, "title" | "color" | "elements">>) => {
      setLocalItems((prev) => {
        const current = prev ?? items;
        const next = current.map((c) =>
          c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c,
        );
        persist(next);
        return next;
      });
    },
    [items, persist],
  );

  return { items, saveFromRecent, createCard, removeCard, updateCard };
}
