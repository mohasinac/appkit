"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrentProfile, useUpdateCurrentProfile } from "./useProfile";

const PERSIST_DEBOUNCE_MS = 600;

export interface UseCollapsedSectionsOptions {
  /** Every section ID this page manages, in display order. IDs must be
   * globally unique across pages (prefix with a page key, e.g.
   * "admin-dashboard:alerts") — uiPreferences.collapsedSections is a single
   * flat list shared by the whole user document, not namespaced server-side.
   * A section ID absent from the saved list defaults to collapsed, which is
   * also the state for a user who has never touched this page. */
  sectionIds: string[];
}

export interface UseCollapsedSectionsResult {
  isCollapsed: (id: string) => boolean;
  /** Accordion within this hook's own sectionIds — expanding one collapses
   * every other section this call manages; collapsing the open one leaves
   * everything collapsed. */
  toggle: (id: string) => void;
}

/** Persisted, per-user, accordion-scoped collapse state for a page's
 * dashboard sections. Debounces writes to PATCH /api/user/profile so rapid
 * toggling doesn't fire a request per click. */
export function useCollapsedSections({
  sectionIds,
}: UseCollapsedSectionsOptions): UseCollapsedSectionsResult {
  const { data: profile } = useCurrentProfile();
  const updateProfile = useUpdateCurrentProfile();

  // Full server-side list, including other pages' entries this hook must
  // never clobber when it persists its own page's next state.
  const savedFullListRef = useRef<string[]>([]);
  const [localCollapsed, setLocalCollapsed] = useState<Set<string> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionIdsRef = useRef(sectionIds);
  sectionIdsRef.current = sectionIds;

  useEffect(() => {
    if (!profile) return;
    const serverList = profile.uiPreferences?.collapsedSections;
    savedFullListRef.current = serverList ?? [];
    setLocalCollapsed((prev) => {
      if (prev !== null) return prev; // local interaction already in progress — don't clobber it
      const known = new Set(serverList ?? []);
      const initial = new Set<string>();
      for (const id of sectionIdsRef.current) {
        // Never-set user (serverList undefined) → default every section collapsed.
        if (serverList === undefined || known.has(id)) initial.add(id);
      }
      return initial;
    });
  }, [profile]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const persist = useCallback((nextForThisPage: Set<string>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const ids = sectionIdsRef.current;
      const others = savedFullListRef.current.filter((id) => !ids.includes(id));
      const merged = [...others, ...nextForThisPage];
      savedFullListRef.current = merged;
      updateProfile.mutate({ uiPreferences: { collapsedSections: merged } });
    }, PERSIST_DEBOUNCE_MS);
  }, [updateProfile]);

  const isCollapsed = useCallback(
    (id: string) => localCollapsed?.has(id) ?? true,
    [localCollapsed],
  );

  const toggle = useCallback((id: string) => {
    setLocalCollapsed((prev) => {
      const wasCollapsed = prev?.has(id) ?? true;
      const next = wasCollapsed
        ? new Set(sectionIdsRef.current.filter((s) => s !== id)) // opening id collapses every sibling
        : new Set(sectionIdsRef.current); // closing the open one — back to all-collapsed
      persist(next);
      return next;
    });
  }, [persist]);

  return { isCollapsed, toggle };
}
