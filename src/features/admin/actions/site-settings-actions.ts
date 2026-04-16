/**
 * Site Settings Domain Actions — appkit
 *
 * Pure async functions for site settings CRUD. No auth, no rate-limit.
 * Called by letitrip thin wrappers which handle auth + rate limiting.
 */

import { siteSettingsRepository } from "../repository/site-settings.repository";
import { serverLogger } from "../../../monitoring/index";

export async function getSiteSettings(): Promise<unknown> {
  const settings = await siteSettingsRepository.getSingleton();
  return settings ?? null;
}

export async function updateSiteSettings(
  adminId: string,
  data: Record<string, unknown>,
): Promise<void> {
  await siteSettingsRepository.updateSingleton(data as any);
  serverLogger.info("updateSiteSettings", { adminId });
}
