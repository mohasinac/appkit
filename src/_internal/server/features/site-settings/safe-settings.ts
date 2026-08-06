import { normalizeError } from "../../../../errors/normalize";
import { serverLogger } from "../../../../monitoring/server-logger";
import { getSiteSettingsGlobal } from "../../../../features/admin/utils/getSiteSettingsGlobal";
import type { SiteSettingsDocument } from "../../../../features/admin/schemas/firestore";

/**
 * Null-safe wrapper around getSiteSettingsGlobal().
 *
 * Use in API routes and server actions that can degrade gracefully when
 * site settings are unavailable (feature flags, watermark config, etc.).
 * Returns null on Firestore failure; the caller decides the fallback.
 *
 * For paths where missing settings are a hard error (e.g. billing config),
 * call getSiteSettingsGlobal() directly so the 500 propagates naturally.
 */
export async function getSiteSettingsSafe(): Promise<SiteSettingsDocument | null> {
  try {
    return await getSiteSettingsGlobal();
  } catch (err) {
    void normalizeError(err);
    serverLogger.warn("getSiteSettingsSafe: Firestore read failed — degrading to null", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
