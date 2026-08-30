"use client";
import { useMemo, useState } from "react";
import { matchesNavQuery, type NavSearchable } from "../../../shared/features/layout/matchesNavQuery";

/**
 * Shared inline-filter logic for the Admin/Store/User sidebars. Each sidebar
 * keeps its own accordion/markup; only this filtering is shared so it is not
 * rewritten three times.
 *
 * ## It searches what a screen is FOR, not just what it is called
 *
 * This was `item.label.toLowerCase().includes(q)`, which could only find a
 * screen by the name already on the button. "refund" found nothing, because
 * the screen is called Payouts. "postcode" found nothing, because the field is
 * called PIN code. "maintenance" found nothing, because that toggle lives
 * inside Site Settings. W6 gave every nav item a `description` and `keywords`;
 * `matchesNavQuery` reads all three.
 *
 * ## Results are RANKED, and within a group only
 *
 * A label hit beats a keyword hit beats a description hit, so typing "orders"
 * puts **Orders** above the guide that merely mentions orders. Groups keep
 * their declared order — reordering them by best score would move the sidebar
 * around under the reader's cursor while they type.
 */
export function useSidebarSearch<
  Item extends { href: string; label: string } & Partial<NavSearchable>,
  Group extends { title: string; items: Item[]; defaultOpen?: boolean },
>(groups: Group[]) {
  const [query, setQuery] = useState("");
  const isSearching = query.trim().length > 0;

  const filteredGroups = useMemo<Group[]>(() => {
    if (!isSearching) return groups;
    return groups
      .map((group) => {
        const scored = group.items
          .map((item) => ({ item, score: matchesNavQuery(item, query) }))
          .filter((entry) => entry.score > 0)
          .sort((a, b) => b.score - a.score);
        return { ...group, items: scored.map((entry) => entry.item) };
      })
      .filter((group) => group.items.length > 0);
  }, [groups, query, isSearching]);

  return { query, setQuery, isSearching, filteredGroups };
}
