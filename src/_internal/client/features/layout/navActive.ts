/**
 * Shared "which nav item/group is active" algorithm for the Admin/Store/User
 * dashboard sidebars and the public AppLayoutShell sidebar. Longest matching
 * href wins (rather than every prefix-matching item lighting up independently)
 * so a short root route like "/store" or "/user" (each sidebar's own
 * "Dashboard" item) never lights up alongside a real, more specific match —
 * see CLAUDE.md Recurrent Root Cause Patterns for the incident this fixes.
 */

function isPrefixMatch(href: string, activeHref: string): boolean {
  return activeHref === href || activeHref.startsWith(`${href}/`);
}

export function findActiveNavItem<Item extends { href: string }>(
  items: Item[],
  activeHref: string,
): Item | undefined {
  let best: Item | undefined;
  for (const item of items) {
    if (!isPrefixMatch(item.href, activeHref)) continue;
    if (!best || item.href.length > best.href.length) best = item;
  }
  return best;
}

export function findActiveNavGroup<
  Item extends { href: string },
  Group extends { title: string; items: Item[] },
>(groups: Group[], activeHref: string): Group | undefined {
  let bestGroup: Group | undefined;
  let bestLen = -1;
  for (const group of groups) {
    const item = findActiveNavItem(group.items, activeHref);
    if (item && item.href.length > bestLen) {
      bestGroup = group;
      bestLen = item.href.length;
    }
  }
  return bestGroup;
}
