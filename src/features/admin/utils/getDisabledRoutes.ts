import { getSiteSettingsGlobal } from "./getSiteSettingsGlobal";

/** Returns the hrefs of all disabled nav items (empty array when none disabled). */
export async function getDisabledRoutes(): Promise<string[]> {
  const settings = await getSiteSettingsGlobal();
  return settings?.disabledRoutes ?? [];
}
