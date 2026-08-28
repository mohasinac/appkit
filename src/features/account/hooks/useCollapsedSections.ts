"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeError } from "../../../errors/normalize";
import { useCurrentProfile, useUpdateCurrentProfile } from "./useProfile";

const PERSIST_DEBOUNCE_MS = 600;
const LOCAL_KEY = "letitrip:section-state";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Persisted, per-user, per-surface open/closed state for collapsible sections.
 *
 * `useSectionState` is the implementation; `useCollapsedSections` below is a
 * thin adapter preserving the older hook's exact semantics for its existing
 * call sites.
 *
 * 🛑 THE STORED VALUE IS WHAT IS **OPEN**, NOT WHAT IS COLLAPSED.
 *
 * The predecessor stored `uiPreferences.collapsedSections`: one flat, global,
 * un-namespaced array of collapsed ids, shared by every page and kept apart
 * only by a naming convention. Two consequences, both of which the polarity
 * flip removes rather than patches:
 *
 *   - a never-seen surface had to DEFAULT to collapsed, because "absent" and
 *     "deliberately collapsed" were the same value. Storing what is open makes
 *     a never-seen scope resolve to `defaultOpen` by absence, so "section 1
 *     open, the rest collapsed" needs no sentinel;
 *   - one page's ids could collide with another's.
 *
 * The scope key is `"{portal}:{surface}"` and is supplied by the caller. It is
 * deliberately NOT derived from the section ids — a hash would change the
 * moment a section is added, silently resetting every user's layout.
 *
 * ── localStorage mirror ─────────────────────────────────────────────────────
 * The profile arrives over the network, so a server-only read paints every
 * section in its default state and then snaps to the user's real layout a
 * moment later. Writes go to localStorage synchronously (instant, and it
 * survives for signed-out users) and to the user document debounced (durable,
 * and it follows the user to another device). localStorage seeds first paint;
 * the profile is authoritative once it lands.
 *
 * ── Migration ───────────────────────────────────────────────────────────────
 * One-way and lossless: the first time a scope is read with no `sectionState`
 * entry, its open set is derived from the legacy `collapsedSections`
 * (`sectionIds − collapsed`) and persisted under the new key. `collapsedSections`
 * keeps being written for one release so a rollback loses nothing.
 */

// ─────────────────────────────────────────────────────────────────────────────
// localStorage mirror
// ─────────────────────────────────────────────────────────────────────────────

function readLocalScopes(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    // Validate rather than trust: this value survives across releases and a
    // shape written by an older version must degrade to "no preference", not
    // to a render crash. Every entry is checked, so the cast above is a claim
    // this loop then makes true.
    const out: Record<string, string[]> = {};
    for (const [scope, ids] of Object.entries(parsed)) {
      if (Array.isArray(ids)) out[scope] = ids.filter((id) => typeof id === "string");
    }
    return out;
    // localStorage throws on access in private mode, and JSON.parse throws on a
    // value some other version wrote. Neither is reportable — the user document
    // is the durable copy and this is only a first-paint cache — but the throw
    // is still normalized rather than swallowed raw.
  } catch (err) {
    void normalizeError(err);
    return {};
  }
}

function writeLocalScope(scope: string, openIds: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const all = readLocalScopes();
    all[scope] = openIds;
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
    // setItem throws on quota exhaustion and in private mode. Same reasoning as
    // readLocalScopes — the debounced profile PATCH is the durable write, so
    // losing the mirror costs one frame of default layout and nothing else.
  } catch (err) {
    void normalizeError(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useSectionState
// ─────────────────────────────────────────────────────────────────────────────

export type SectionExpandMode = "multi" | "single";

export interface UseSectionStateOptions {
  /** `"{portal}:{surface}"`, e.g. `"admin:dashboard"` or `"store:product-form"`. */
  scope: string;
  /** Every section id this surface manages, in display order. */
  sectionIds: string[];
  /**
   * Which sections are open for a user who has never touched this surface.
   * Defaults to the FIRST section — "required first, everything else
   * collapsed". Pass `[]` for all-collapsed.
   */
  defaultOpen?: string[];
  /** `"multi"` (default) lets several sections be open at once. `"single"` is
   * accordion: opening one closes its siblings. */
  mode?: SectionExpandMode;
}

export interface UseSectionStateResult {
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
  /** Force a section open without closing anything — what a validation error
   * needs. Never collapses, even under `mode: "single"`. */
  open: (id: string) => void;
  openIds: string[];
}

export function useSectionState({
  scope,
  sectionIds,
  defaultOpen,
  mode = "multi",
}: UseSectionStateOptions): UseSectionStateResult {
  const { data: profile } = useCurrentProfile();
  const updateProfile = useUpdateCurrentProfile();

  const sectionIdsRef = useRef(sectionIds);
  sectionIdsRef.current = sectionIds;

  const fallbackOpen = useMemo(
    () => defaultOpen ?? (sectionIds.length > 0 ? [sectionIds[0]!] : []),
    // Only the first id matters for the default, so this does not need to
    // re-run every time the array identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [defaultOpen, sectionIds[0], sectionIds.length],
  );
  const fallbackOpenRef = useRef(fallbackOpen);
  fallbackOpenRef.current = fallbackOpen;

  // Server copy of EVERY scope, so persisting this surface never clobbers
  // another's entry.
  const savedScopesRef = useRef<Record<string, string[]>>({});
  const legacyCollapsedRef = useRef<string[] | undefined>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Seeded synchronously from localStorage so first paint is already correct.
  const [localOpen, setLocalOpen] = useState<Set<string> | null>(() => {
    const cached = readLocalScopes()[scope];
    return cached ? new Set(cached) : null;
  });

  useEffect(() => {
    if (!profile) return;
    const prefs = profile.uiPreferences;
    savedScopesRef.current = prefs?.sectionState ?? {};
    legacyCollapsedRef.current = prefs?.collapsedSections;

    const stored = savedScopesRef.current[scope];
    if (stored) {
      setLocalOpen(new Set(stored));
      return;
    }

    // No entry for this scope yet — derive one from the legacy flat list if the
    // user has one, otherwise fall back to the default. Persisting is left to
    // the first real toggle: writing on mere page view would fire a profile
    // PATCH for every visitor on every dashboard.
    const legacy = legacyCollapsedRef.current;
    if (legacy !== undefined) {
      const collapsed = new Set(legacy);
      setLocalOpen(new Set(sectionIdsRef.current.filter((id) => !collapsed.has(id))));
    } else {
      setLocalOpen(new Set(fallbackOpenRef.current));
    }
  }, [profile, scope]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const persist = useCallback(
    (next: Set<string>) => {
      const openIds = sectionIdsRef.current.filter((id) => next.has(id));
      writeLocalScope(scope, openIds);

      savedScopesRef.current = { ...savedScopesRef.current, [scope]: openIds };

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        // Keep writing the legacy list for one release: derived from this
        // surface's ids only, merged over whatever other pages recorded, so a
        // rollback finds the same state it would have written itself.
        const ids = sectionIdsRef.current;
        const others = (legacyCollapsedRef.current ?? []).filter((id) => !ids.includes(id));
        const collapsedHere = ids.filter((id) => !next.has(id));
        const mergedLegacy = [...others, ...collapsedHere];
        legacyCollapsedRef.current = mergedLegacy;

        updateProfile.mutate({
          uiPreferences: {
            sectionState: { [scope]: openIds },
            collapsedSections: mergedLegacy,
          },
        });
      }, PERSIST_DEBOUNCE_MS);
    },
    [scope, updateProfile],
  );

  const effectiveOpen = localOpen ?? new Set(fallbackOpen);

  const isOpen = useCallback(
    (id: string) => (localOpen ?? new Set(fallbackOpenRef.current)).has(id),
    [localOpen],
  );

  const toggle = useCallback(
    (id: string) => {
      setLocalOpen((prev) => {
        const current = prev ?? new Set(fallbackOpenRef.current);
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else if (mode === "single") {
          next.clear();
          next.add(id);
        } else next.add(id);
        persist(next);
        return next;
      });
    },
    [mode, persist],
  );

  const open = useCallback(
    (id: string) => {
      setLocalOpen((prev) => {
        const current = prev ?? new Set(fallbackOpenRef.current);
        if (current.has(id)) return current;
        // Deliberately additive even under `mode: "single"`: this exists for
        // error recovery, and collapsing the section the user was just editing
        // in order to reveal the one that failed loses their place.
        const next = new Set(current);
        next.add(id);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const openIds = useMemo(
    () => sectionIds.filter((id) => effectiveOpen.has(id)),
    // effectiveOpen is derived from localOpen; depending on the Set identity
    // directly would recompute on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sectionIds, localOpen, fallbackOpen],
  );

  return { isOpen, toggle, open, openIds };
}

// ─────────────────────────────────────────────────────────────────────────────
// useCollapsedSections — adapter over the above
// ─────────────────────────────────────────────────────────────────────────────

export interface UseCollapsedSectionsOptions {
  /** Every section ID this page manages, in display order. */
  sectionIds: string[];
  /** Scope key. Optional only so the pre-existing call sites keep compiling;
   * they share `"legacy:collapsed-sections"`, which reproduces the old global
   * behaviour exactly. New code should call `useSectionState` directly. */
  scope?: string;
}

export interface UseCollapsedSectionsResult {
  isCollapsed: (id: string) => boolean;
  /** Accordion within this hook's own sectionIds — expanding one collapses
   * every other section this call manages; collapsing the open one leaves
   * everything collapsed. */
  toggle: (id: string) => void;
}

/**
 * @deprecated Prefer `useSectionState`, which is namespaced per surface,
 * supports several sections open at once, and defaults to section 1 open.
 *
 * Kept so the existing dashboard call sites need no edit. Semantics are
 * byte-identical to the original: default all-collapsed (`defaultOpen: []`)
 * and accordion (`mode: "single"`).
 */
export function useCollapsedSections({
  sectionIds,
  scope = "legacy:collapsed-sections",
}: UseCollapsedSectionsOptions): UseCollapsedSectionsResult {
  const { isOpen, toggle } = useSectionState({
    scope,
    sectionIds,
    defaultOpen: [],
    mode: "single",
  });

  const isCollapsed = useCallback((id: string) => !isOpen(id), [isOpen]);
  return { isCollapsed, toggle };
}
