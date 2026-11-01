/**
 * Phase 10 ("widget descriptors") — reads `SettingsPreviewDef` current
 * values off the SAME `["admin","site-settings"]` query cache
 * `AdminSiteSettingsView.tsx` already populates. No new fetch: if the real
 * settings page has been visited this session, `useQuery` serves this from
 * cache instantly; if not, it fires the identical request the settings page
 * itself would — never a second, parallel read path.
 *
 * One hook (`useSiteSettingsPreviewData`), called once per mount, plus a
 * plain resolver function (`resolveSettingPreviewValue`) — not one hook per
 * `SettingsPreviewDef`, which would violate the Rules of Hooks the moment a
 * caller maps over the ~10-entry registry.
 *
 * The field-path map below is read directly off `AdminSiteSettingsView.tsx`'s
 * own `s.xxx?.yyy ?? default` seeding lines (2026-11-02) — not guessed from
 * each toggle's label.
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import type { SettingsPreviewDef } from "../../../_internal/shared/features/site-settings/settings-preview-registry";

const FIELD_PATH_BY_SETTING_ID: Record<string, { read: (s: Record<string, any>) => boolean; default: boolean }> = {
  "announcement-bar": { read: (s) => s.announcementBar?.enabled, default: false },
  "robots-noindex": { read: (s) => s.seo?.noIndex, default: false },
  "razorpay-enabled": { read: (s) => s.payment?.razorpayEnabled, default: false },
  "phonepe-enabled": { read: (s) => s.payment?.phonepeEnabled, default: false },
  "cashfree-enabled": { read: (s) => s.payment?.cashfreeEnabled, default: false },
  "manual-payment-enabled": { read: (s) => s.payment?.upiManualEnabled, default: true },
  "cod-enabled": { read: (s) => s.payment?.codEnabled, default: true },
  "email-notifications": { read: (s) => s.notificationChannels?.email?.enabled, default: false },
  "daily-digest": { read: (s) => s.emailSettings?.dailyDigest?.enabled, default: false },
  "whatsapp-notifications": { read: (s) => s.notificationChannels?.whatsapp?.enabled, default: false },
};

export function useSiteSettingsPreviewData(): { data: Record<string, any>; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "site-settings"],
    queryFn: async () => {
      const res = await apiClient.get(ADMIN_ENDPOINTS.ADMIN_SITE);
      return (res as any)?.data ?? res;
    },
  });
  return { data: (data ?? {}) as Record<string, any>, isLoading };
}

export function resolveSettingPreviewValue(def: SettingsPreviewDef, s: Record<string, any>): boolean {
  const entry = FIELD_PATH_BY_SETTING_ID[def.id];
  return entry ? (entry.read(s) ?? entry.default) : false;
}
