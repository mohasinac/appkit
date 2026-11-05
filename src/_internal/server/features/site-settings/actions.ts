import { siteSettingsRepository } from "../../../../features/admin/repository/site-settings.repository";

/**
 * Toggle a single action's enabled state in siteSettings.actionConfig.
 * Performs a sparse merge — only updates the one key.
 */
export async function updateActionConfigDomain(
  actionId: string,
  enabled: boolean,
): Promise<void> {
  await siteSettingsRepository.updateSingleton({
    actionConfig: { [actionId]: { enabled } },
  } as any);
}

/**
 * Toggle a single nav item's enabled state in siteSettings.navConfig.
 * Also recomputes the derived disabledRoutes[] array from all current nav items.
 * The `allNavItems` argument is the full { id, href } list so we can derive disabledRoutes.
 *
 * Preserves the item's existing `order` (3B-1b backlog item 4) — this only
 * ever writes `enabled`, so a plain `{ enabled }` replacement would silently
 * drop a prior reorder every time an item is hidden/shown again.
 */
export async function updateNavConfigDomain(
  navId: string,
  enabled: boolean,
  allNavItems: Array<{ id: string; href: string }>,
): Promise<void> {
  const current = await siteSettingsRepository.getSingleton();
  const existingOrder = (current.navConfig as Record<string, { enabled: boolean; order?: number }> | undefined)?.[navId]?.order;
  const merged: Record<string, { enabled: boolean; order?: number }> = {
    ...(current.navConfig ?? {}),
    [navId]: { enabled, ...(existingOrder !== undefined ? { order: existingOrder } : {}) },
  };

  const disabledRoutes = allNavItems
    .filter((item) => (merged[item.id]?.enabled ?? true) === false)
    .map((item) => item.href);

  await siteSettingsRepository.updateSingleton({
    navConfig: merged,
    disabledRoutes,
  } as any);
}

/**
 * Bulk-write per-item `order` into siteSettings.navConfig, for one nav
 * group's reordered item list. Writes the WHOLE ordered list at once (like
 * `fieldOrder: string[]` elsewhere) rather than one id at a time, because
 * "move item X up" is a change to every sibling's relative order, not just
 * X's — a single-item patch would need the caller to already know the new
 * order of every other item anyway.
 *
 * Preserves each item's existing `enabled` state — reordering must never
 * silently re-enable (or disable) an item. Does NOT touch `disabledRoutes`:
 * that array is derived from PUBLIC nav items only (see
 * `updateNavConfigDomain` above), and reorder is dashboard-sidebar-only
 * today (3B-1b backlog item 4) — a dashboard item was never eligible to
 * appear in `disabledRoutes` in the first place.
 */
export async function updateNavOrderDomain(
  orderedIds: string[],
): Promise<void> {
  const current = await siteSettingsRepository.getSingleton();
  const merged: Record<string, { enabled: boolean; order?: number }> = {
    ...(current.navConfig ?? {}),
  };
  orderedIds.forEach((id, index) => {
    merged[id] = { enabled: merged[id]?.enabled ?? true, order: index };
  });
  await siteSettingsRepository.updateSingleton({
    navConfig: merged,
  } as any);
}

/**
 * Admin-created NEW nav entries (overhaul brief, Table D — safe version).
 * `item` is copied from the caller's closed, pre-registered candidate list
 * (`ActionDef`s with a real `href`) — this function trusts the caller the
 * same way `updateNavConfigDomain` trusts `allNavItems`, it does not
 * re-validate the href against anything, because there is no free-text
 * path into this function for a malformed value to take.
 */
export async function addNavEntryDomain(
  group: "admin" | "store" | "user",
  item: { id: string; href: string; label: string; requiredPermission?: string },
): Promise<void> {
  const current = await siteSettingsRepository.getSingleton();
  const existing = current.navCustomEntries ?? [];
  if (existing.some((e) => e.id === item.id)) return;
  await siteSettingsRepository.updateSingleton({
    navCustomEntries: [...existing, { ...item, group }],
  } as any);
}

/** The removal half — see `addNavEntryDomain`. */
export async function removeNavEntryDomain(navId: string): Promise<void> {
  const current = await siteSettingsRepository.getSingleton();
  await siteSettingsRepository.updateSingleton({
    navCustomEntries: (current.navCustomEntries ?? []).filter((e) => e.id !== navId),
  } as any);
}
