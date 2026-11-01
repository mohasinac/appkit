"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeError } from "../../../errors/normalize";
import { STORAGE_KEYS } from "../../../constants/storage-keys";
import { useCurrentProfile, useUpdateCurrentProfile } from "../../account/hooks/useProfile";

const PERSIST_DEBOUNCE_MS = 600;

/**
 * Per-user dashboard-hub-card hiding (Phase 4A, overhaul brief — point 1's
 * "silence panels I don't use without an admin-wide change").
 *
 * Same localStorage-mirror + debounced-profile-persist shape as
 * `useSectionState`, deliberately NOT reusing that hook directly: this field
 * has no legacy flat-list predecessor to migrate from, so the extra
 * derivation branch would be dead weight here.
 *
 * 🛑 This is additive to site-level visibility, never a replacement for it.
 * `DashboardHubView` must filter by BOTH — a card that does not exist for
 * this portal/role at all is never in the `cards` array this hook receives,
 * and a card the user hid stays hidden regardless of what the admin does
 * with nav config. Neither list can override the other.
 */

function readLocalHidden(scope: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.hiddenHubCards);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    const ids = parsed?.[scope];
    return Array.isArray(ids) ? new Set(ids.filter((id) => typeof id === "string")) : new Set();
  } catch (err) {
    void normalizeError(err);
    return new Set();
  }
}

function writeLocalHidden(scope: string, hiddenIds: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.hiddenHubCards);
    const all = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
    all[scope] = hiddenIds;
    window.localStorage.setItem(STORAGE_KEYS.hiddenHubCards, JSON.stringify(all));
  } catch (err) {
    // audit-silent-degrade-ok: `persist()` calls this unconditionally before
    // scheduling the debounced profile mutation (the durable copy), which
    // does not depend on this write having succeeded — a failure here
    // (quota exceeded, private-mode storage block) only costs the no-flash
    // local mirror for this one device/session, never the hide action itself.
    void normalizeError(err);
  }
}

export interface UseHiddenHubCardsResult {
  isHidden: (cardKey: string) => boolean;
  hide: (cardKey: string) => void;
  unhide: (cardKey: string) => void;
  /** Every hidden key in THIS scope — a restore-bar's "N hidden" count and "show all" need the full set, not a per-key check. */
  hiddenKeys: string[];
}

/** `scope`: `"{portal}:hub"`, e.g. `"store:hub"` — namespaced so admin/store/user never collide. */
export function useHiddenHubCards(scope: string): UseHiddenHubCardsResult {
  const { data: profile } = useCurrentProfile();
  const updateProfile = useUpdateCurrentProfile();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [localHidden, setLocalHidden] = useState<Set<string> | null>(() => readLocalHidden(scope));

  useEffect(() => {
    const stored = profile?.uiPreferences?.hiddenHubCards?.[scope];
    if (stored) setLocalHidden(new Set(stored));
  }, [profile, scope]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const persist = useCallback(
    (next: Set<string>) => {
      const hiddenIds = [...next];
      writeLocalHidden(scope, hiddenIds);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateProfile.mutate({
          uiPreferences: { hiddenHubCards: { [scope]: hiddenIds } },
        });
      }, PERSIST_DEBOUNCE_MS);
    },
    [scope, updateProfile],
  );

  const effectiveHidden = useMemo(() => localHidden ?? new Set<string>(), [localHidden]);

  const isHidden = useCallback((cardKey: string) => effectiveHidden.has(cardKey), [effectiveHidden]);

  const hide = useCallback(
    (cardKey: string) => {
      setLocalHidden((prev) => {
        const next = new Set(prev ?? effectiveHidden);
        next.add(cardKey);
        persist(next);
        return next;
      });
    },
    [effectiveHidden, persist],
  );

  const unhide = useCallback(
    (cardKey: string) => {
      setLocalHidden((prev) => {
        const next = new Set(prev ?? effectiveHidden);
        next.delete(cardKey);
        persist(next);
        return next;
      });
    },
    [effectiveHidden, persist],
  );

  return { isHidden, hide, unhide, hiddenKeys: [...effectiveHidden] };
}
