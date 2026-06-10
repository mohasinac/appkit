"use client";

import { useState, useEffect, useCallback } from "react";
import { Stack, Row, Text, Button, Div, useToast } from "../../../ui";
import { useSiteSettings } from "../../../core/hooks/useSiteSettings";
import type { NotificationPreferences, NotificationChannelPrefs, NotificationTypePrefs } from "../types";
import type { NotificationChannelConfig } from "../../admin/schemas/firestore";

const __O = {
  hidden: "overflow-hidden",
} as const;

interface SiteSettingsShape {
  notificationChannels?: NotificationChannelConfig;
}

// ─── type-row config ────────────────────────────────────────────────────────

const TYPE_ROWS: { key: keyof NotificationTypePrefs; label: string; description: string }[] = [
  { key: "orderUpdates", label: "Order updates",    description: "Placed, shipped, delivered, cancelled, refunded" },
  { key: "bids",         label: "Auction bids",     description: "Outbid alerts and auction win/loss" },
  { key: "offers",       label: "Offers",           description: "New offers received, counter-offers, responses" },
  { key: "reviews",      label: "Reviews",          description: "Review approved, seller reply" },
  { key: "messages",     label: "Messages",         description: "New buyer-seller chat messages" },
  { key: "promotions",   label: "Promotions",       description: "Coupons, sales and platform events" },
  { key: "system",       label: "System & welcome", description: "Account alerts and platform announcements" },
];

// ─── Toggle row ─────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Row align="center" justify="between" gap="md" className="py-3 border-b last:border-0 border-[var(--appkit-color-border)]">
      <Div className="min-w-0">
        <Text className="text-sm font-medium text-[var(--appkit-color-text)]">{label}</Text>
        <Text variant="secondary" className="text-xs mt-0.5">{description}</Text>
      </Div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
          "transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-[var(--appkit-color-primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-[var(--appkit-color-primary)]" : "bg-[var(--appkit-color-border-strong,#a1a1aa)]",
        ].join(" ")}
      >
        <span
          className={[
            "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg",
            "ring-0 transition duration-200 ease-in-out",
            checked ? "translate-x-4" : "translate-x-0",
          ].join(" ")}
        />
      </button>
    </Row>
  );
}

// ─── Section card ───────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Div className={`rounded-xl border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] ${__O.hidden}`}>
      <Div className="px-4 py-3 border-b border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-alt,var(--appkit-color-surface))]">
        <Text className="text-xs font-semibold uppercase tracking-widest text-[var(--appkit-color-text-muted)]">
          {title}
        </Text>
      </Div>
      <Div className="px-4">{children}</Div>
    </Div>
  );
}

// ─── Panel ──────────────────────────────────────────────────────────────────

export interface NotificationPreferencesPanelProps {
  /** Fetch URL — defaults to /api/user/notification-preferences */
  fetchUrl?: string;
  /** Save URL — defaults to /api/user/notification-preferences */
  saveUrl?: string;
  onSave?: (prefs: NotificationPreferences) => void;
}

export function NotificationPreferencesPanel({
  fetchUrl = "/api/user/notification-preferences",
  saveUrl = "/api/user/notification-preferences",
  onSave,
}: NotificationPreferencesPanelProps) {
  const { showToast } = useToast();
  const { data: settings } = useSiteSettings<SiteSettingsShape>();
  const adminChannels = settings?.notificationChannels;

  const [channels, setChannels] = useState<NotificationChannelPrefs>({ email: true, whatsapp: true, sms: true });
  const [types, setTypes] = useState<NotificationTypePrefs>({
    orderUpdates: true, bids: true, promotions: true,
    system: true, reviews: true, messages: true, offers: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(fetchUrl, { credentials: "include" })
      .then((r) => r.json())
      .then((json: { data?: { notificationPreferences?: NotificationPreferences } }) => {
        const prefs = json.data?.notificationPreferences;
        if (prefs?.channels) setChannels((prev) => ({ ...prev, ...prefs.channels }));
        if (prefs?.types)    setTypes((prev)    => ({ ...prev, ...prefs.types }));
      })
      .catch(() => {}) // audit-silent-catch-ok: defaults render if fetch fails; user can still edit and save
      .finally(() => setLoading(false));
  }, [fetchUrl]);

  const setChannel = useCallback((key: keyof NotificationChannelPrefs, val: boolean) => {
    setChannels((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  }, []);

  const setType = useCallback((key: keyof NotificationTypePrefs, val: boolean) => {
    setTypes((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const prefs: NotificationPreferences = { channels, types };
      const res = await fetch(saveUrl, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error((body as { error?: string })?.error ?? "Failed to save preferences");
      }
      setSaved(true);
      showToast("Preferences saved.", "success");
      onSave?.(prefs);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save preferences.", "error");
    } finally {
      setSaving(false);
    }
  }, [channels, types, saveUrl, onSave, showToast]);

  if (loading) {
    return (
      <Div className="py-8 text-center">
        <Text variant="secondary" className="text-sm">Loading preferences…</Text>
      </Div>
    );
  }

  // Which channels are admin-enabled (only show those toggles to the user)
  const emailAdminEnabled   = adminChannels?.email?.enabled ?? false;
  const whatsappAdminEnabled = adminChannels?.whatsapp?.enabled ?? false;
  const smsAdminEnabled     = adminChannels?.sms?.enabled ?? false;
  const anyChannelEnabled   = emailAdminEnabled || whatsappAdminEnabled || smsAdminEnabled;

  return (
    <Stack gap="lg">
      {/* In-app is always on */}
      <SectionCard title="In-app notifications">
        <Row align="center" justify="between" gap="md" className="py-3">
          <Div>
            <Text className="text-sm font-medium text-[var(--appkit-color-text)]">In-app notifications</Text>
            <Text variant="secondary" className="text-xs mt-0.5">
              Always on — displayed in the notification bell and inbox
            </Text>
          </Div>
          <Div className="h-5 w-9 rounded-full bg-[var(--appkit-color-primary)] flex items-center justify-end px-0.5" aria-label="Always on">
            <span className="h-4 w-4 rounded-full bg-white shadow" />
          </Div>
        </Row>
      </SectionCard>

      {/* External channels — only if admin has at least one enabled */}
      {anyChannelEnabled && (
        <SectionCard title="Notification channels">
          {emailAdminEnabled && (
            <ToggleRow
              label="Email"
              description="Receive notifications by email"
              checked={channels.email !== false}
              onChange={(v) => setChannel("email", v)}
            />
          )}
          {whatsappAdminEnabled && (
            <ToggleRow
              label="WhatsApp"
              description="Receive notifications on WhatsApp"
              checked={channels.whatsapp !== false}
              onChange={(v) => setChannel("whatsapp", v)}
            />
          )}
          {smsAdminEnabled && (
            <ToggleRow
              label="SMS"
              description="Receive SMS text notifications"
              checked={channels.sms !== false}
              onChange={(v) => setChannel("sms", v)}
            />
          )}
        </SectionCard>
      )}

      {/* Per-type controls */}
      <SectionCard title="Notification types">
        {TYPE_ROWS.map((row) => (
          <ToggleRow
            key={row.key}
            label={row.label}
            description={row.description}
            checked={types[row.key] !== false}
            onChange={(v) => setType(row.key, v)}
          />
        ))}
      </SectionCard>

      <Row justify="end" gap="sm">
        {saved && (
          <Text className="text-sm text-[var(--appkit-color-success,#16a34a)] self-center">
            Preferences saved ✓
          </Text>
        )}
        <Button onClick={handleSave} isLoading={saving} size="sm">
          Save preferences
        </Button>
      </Row>
    </Stack>
  );
}
