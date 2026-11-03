"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeError } from "../../../errors/normalize";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import type { CardElement, DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";

const PERSIST_DEBOUNCE_MS = 600;

function genCardId(): string {
  // Timestamp + a short random suffix — same scheme `useSavedCards` already
  // uses; not security-sensitive, and the write that actually persists it
  // goes through an admin-only API route regardless of what a client mints.
  return `card-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface UsePageRegionResult {
  cards: DashboardCard[];
  createCard: (initial?: { title?: string; color?: string; elements?: CardElement[] }) => string;
  removeCard: (id: string) => void;
  updateCard: (id: string, patch: Partial<Pick<DashboardCard, "title" | "color" | "elements" | "spans">>) => void;
  /** True while a debounced write is in flight — not a loading-skeleton signal, just a small "saving…" affordance if the caller wants one. */
  saving: boolean;
}

/**
 * Admin-composable page region (Phase 3B, first slice) — the write-side
 * counterpart to `getPageRegion()` (appkit `server.ts`). Deliberately NOT a
 * copy of `useSavedCards`'s localStorage-mirror shape: that mirror exists so
 * ONE user's own device shows their cards instantly before their profile
 * loads. A page region is SHARED — every admin viewing this page already
 * gets the current state for free from `initialCards`, server-rendered, so
 * there is nothing for a local device-only cache to buy here.
 *
 * `pageId` identifies which `pageRegions/{pageId}` document this hook reads
 * and writes — callers pass a stable, hand-chosen id (e.g. `"admin-guide"`),
 * not a route-derived one, so renaming a route doesn't orphan its content.
 */
export function usePageRegion(pageId: string, initialCards: DashboardCard[]): UsePageRegionResult {
  const [cards, setCards] = useState<DashboardCard[]>(initialCards);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const persist = useCallback(
    (next: DashboardCard[]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSaving(true);
        fetch(ADMIN_ENDPOINTS.PAGE_REGION_BY_ID(encodeURIComponent(pageId)), {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ cards: next }),
        })
          .catch((err) => void normalizeError(err))
          .finally(() => setSaving(false));
      }, PERSIST_DEBOUNCE_MS);
    },
    [pageId],
  );

  const createCard = useCallback(
    (initial?: { title?: string; color?: string; elements?: CardElement[] }): string => {
      const id = genCardId();
      const now = new Date().toISOString();
      const card: DashboardCard = {
        id,
        title: initial?.title,
        color: initial?.color,
        // Same reasoning as `useSavedCards.createCard` — the server's own
        // Zod schema requires `elements.min(1)`; a single blank `text`
        // element is the correct empty state, not an empty array.
        elements: initial?.elements?.length ? initial.elements : [{ kind: "text", body: "" }],
        saved: true,
        createdAt: now,
        updatedAt: now,
      };
      setCards((prev) => {
        const next = [...prev, card];
        persist(next);
        return next;
      });
      return id;
    },
    [persist],
  );

  const removeCard = useCallback(
    (id: string) => {
      setCards((prev) => {
        const next = prev.filter((c) => c.id !== id);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const updateCard = useCallback(
    (id: string, patch: Partial<Pick<DashboardCard, "title" | "color" | "elements" | "spans">>) => {
      setCards((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c));
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return { cards, createCard, removeCard, updateCard, saving };
}
