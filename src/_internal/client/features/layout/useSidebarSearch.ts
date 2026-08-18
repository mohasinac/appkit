"use client";
import { useMemo, useState } from "react";

/**
 * Shared inline-filter logic for the Admin/Store/User sidebars — lowercase
 * substring match against item labels, collapsing to only groups with a
 * surviving match. Each sidebar keeps its own accordion/markup; only this
 * pure filtering algorithm is shared so it isn't rewritten three times.
 */
export function useSidebarSearch<
  Item extends { href: string; label: string },
  Group extends { title: string; items: Item[]; defaultOpen?: boolean },
>(groups: Group[]) {
  const [query, setQuery] = useState("");
  const isSearching = query.trim().length > 0;

  const filteredGroups = useMemo<Group[]>(() => {
    if (!isSearching) return groups;
    const q = query.trim().toLowerCase();
    return groups
      .map((group) => ({ ...group, items: group.items.filter((item) => item.label.toLowerCase().includes(q)) }))
      .filter((group) => group.items.length > 0);
  }, [groups, query, isSearching]);

  return { query, setQuery, isSearching, filteredGroups };
}
