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
 */
export async function updateNavConfigDomain(
  navId: string,
  enabled: boolean,
  allNavItems: Array<{ id: string; href: string }>,
): Promise<void> {
  const current = await siteSettingsRepository.getSingleton();
  const merged: Record<string, { enabled: boolean }> = {
    ...(current.navConfig ?? {}),
    [navId]: { enabled },
  };

  const disabledRoutes = allNavItems
    .filter((item) => (merged[item.id]?.enabled ?? true) === false)
    .map((item) => item.href);

  await siteSettingsRepository.updateSingleton({
    navConfig: merged,
    disabledRoutes,
  } as any);
}
