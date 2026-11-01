"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeError } from "../../../errors/normalize";
import { STORAGE_KEYS } from "../../../constants/storage-keys";
import { useCurrentProfile, useUpdateCurrentProfile } from "../../account/hooks/useProfile";
import {
  RECENT_ENTRIES_MAX,
  type RecentEntry,
  type RecentEntryInput,
} from "../../../_internal/shared/features/dashboard/recent-entry";

const PERSIST_DEBOUNCE_MS = 600;

/**
 * Per-user "recently visited / recently used" dashboard-landing cards (Phase
 * 9, overhaul brief — point 8/9's dashboard quick-jump). Same localStorage-
 * mirror + debounced-profile-persist shape as `useHiddenHubCards`, copy-
 * adapted rather than shared per that hook's own stated norm: this field has
 * its own dedupe-and-cap rule a generic "scope -> string[]" hook does not
 * need to know about.
 *
 * 🛑 This is additive to the curated DEFAULT card set, never a replacement
 * for it — when `items` is empty (a fresh profile, or a scope nobody has
 * used yet), the caller (`DashboardQuickJump`) falls back to its own
 * per-portal default list. This hook has no opinion on defaults.
 */

function entryKey(entry: RecentEntry): string {
  switch (entry.kind) {
    case "page":
      return `page:${entry.href}`;
    case "toggle":
      return `toggle:${entry.toggleId}`;
    case "chart":
      return `chart:${entry.chartId}`;
  }
}

function readLocalRecent(scope: string): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.recentlyVisited);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, RecentEntry[]>;
    const entries = parsed?.[scope];
    return Array.isArray(entries) ? entries : [];
  } catch (err) {
    void normalizeError(err);
    return [];
  }
}

function writeLocalRecent(scope: string, entries: RecentEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.recentlyVisited);
    const all = raw ? (JSON.parse(raw) as Record<string, RecentEntry[]>) : {};
    all[scope] = entries;
    window.localStorage.setItem(STORAGE_KEYS.recentlyVisited, JSON.stringify(all));
  } catch (err) {
    // audit-silent-degrade-ok: same reasoning as useHiddenHubCards — the
    // debounced profile mutation below is the durable copy; a failed local
    // mirror write only costs the no-flash fast path on this one device.
    void normalizeError(err);
  }
}

export interface UseRecentlyVisitedResult {
  /** Newest first, already deduped and capped at `RECENT_ENTRIES_MAX`. */
  items: RecentEntry[];
  /** Record a visit/use. Dedupes by the entry's own identity (href/toggleId/chartId) — reusing an existing entry moves it to the front rather than adding a second copy. Stamps `visitedAt` itself; callers never pass one. */
  recordVisit: (entry: RecentEntryInput) => void;
}

/** `scope`: `"{portal}:hub"`, e.g. `"admin:hub"` — same namespacing as `useHiddenHubCards`. */
export function useRecentlyVisited(scope: string): UseRecentlyVisitedResult {
  const { data: profile } = useCurrentProfile();
  const updateProfile = useUpdateCurrentProfile();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [localItems, setLocalItems] = useState<RecentEntry[] | null>(() => readLocalRecent(scope));

  useEffect(() => {
    const stored = profile?.uiPreferences?.recentlyVisited?.[scope];
    if (stored) setLocalItems(stored);
  }, [profile, scope]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const persist = useCallback(
    (next: RecentEntry[]) => {
      writeLocalRecent(scope, next);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateProfile.mutate({
          uiPreferences: { recentlyVisited: { [scope]: next } },
        });
      }, PERSIST_DEBOUNCE_MS);
    },
    [scope, updateProfile],
  );

  const items = useMemo(() => localItems ?? [], [localItems]);

  const recordVisit = useCallback(
    (entry: RecentEntryInput) => {
      setLocalItems((prev) => {
        const current = prev ?? items;
        const full = { ...entry, visitedAt: new Date().toISOString() } as RecentEntry;
        const withoutDuplicate = current.filter((e) => entryKey(e) !== entryKey(full));
        const next = [full, ...withoutDuplicate].slice(0, RECENT_ENTRIES_MAX);
        persist(next);
        return next;
      });
    },
    [items, persist],
  );

  return { items, recordVisit };
}
