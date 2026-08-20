"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrentProfile, useUpdateCurrentProfile } from "./useProfile";

const PERSIST_DEBOUNCE_MS = 600;
const MOBILE_BREAKPOINT_PX = 768;

export type DataViewMode = "table" | "grid" | "list";

/**
 * Persisted, per-user "last saved" listing view-mode preference (table vs
 * grid vs list) — a single global value shared across every listing page,
 * not scoped per page. When the user has never explicitly chosen a view,
 * defaults to "list" (AdminViewCards' one-full-width-card-per-row layout —
 * easier to read than a compacted table) below the mobile breakpoint, and
 * "table" at desktop widths.
 *
 * Only the view-mode toggle is persisted here. Filters, sort, search, and
 * pagination already live in the URL via useUrlTable() and must never be
 * added to this hook — see CLAUDE.md Phase 3 / user directive 2026-08-18.
 */
export function useDataViewMode(fallback: DataViewMode = "list") {
  const { data: profile } = useCurrentProfile();
  const updateProfile = useUpdateCurrentProfile();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [view, setViewState] = useState<DataViewMode>(fallback);
  const hasAppliedDefault = useRef(false);

  // Apply the persisted preference (or a viewport-based default when none
  // exists yet) exactly once per mount, so a later profile refetch doesn't
  // clobber a view the user has since changed locally.
  useEffect(() => {
    if (hasAppliedDefault.current) return;
    if (profile === undefined) return; // still loading — wait rather than flash "table" then jump
    hasAppliedDefault.current = true;
    const saved = profile.uiPreferences?.dataViewMode;
    if (saved) {
      setViewState(saved);
      return;
    }
    if (typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT_PX) {
      setViewState("list");
    }
  }, [profile]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const setView = useCallback(
    (next: DataViewMode) => {
      setViewState(next);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateProfile.mutate({ uiPreferences: { dataViewMode: next } });
      }, PERSIST_DEBOUNCE_MS);
    },
    [updateProfile],
  );

  return { view, setView };
}
