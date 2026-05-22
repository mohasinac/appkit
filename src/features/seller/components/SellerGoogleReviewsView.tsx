"use client";

import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  Alert,
  Button,
  Div,
  FormField,
  Heading,
  Section,
  Stack,
  Text,
  Toggle,
  useToast,
} from "../../../ui";
import { SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";

interface GoogleConfigDraft {
  placeId: string;
  businessName: string;
  isConnected: boolean;
  averageRating?: number;
  totalReviews?: number;
  lastSyncedAt?: string;
}

const EMPTY_DRAFT: GoogleConfigDraft = {
  placeId: "",
  businessName: "",
  isConnected: false,
};

export interface SellerGoogleReviewsViewProps {
  onSave?: (data: Partial<GoogleConfigDraft>) => Promise<void>;
  onSync?: () => Promise<void>;
}

export function SellerGoogleReviewsView({
  onSave,
  onSync,
}: SellerGoogleReviewsViewProps) {
  const [draft, setDraft] = useState<GoogleConfigDraft>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetch(SELLER_ENDPOINTS.GOOGLE_REVIEWS, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        const data = j?.data ?? j ?? {};
        setDraft({
          placeId: String(data.placeId ?? ""),
          businessName: String(data.businessName ?? ""),
          isConnected: Boolean(data.isConnected),
          averageRating: typeof data.averageRating === "number" ? data.averageRating : undefined,
          totalReviews: typeof data.totalReviews === "number" ? data.totalReviews : undefined,
          lastSyncedAt: data.lastSyncedAt ? String(data.lastSyncedAt) : undefined,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      if (onSave) {
        await onSave(draft);
      } else {
        const res = await fetch(SELLER_ENDPOINTS.GOOGLE_REVIEWS, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            placeId: draft.placeId.trim() || undefined,
            businessName: draft.businessName.trim() || undefined,
            isConnected: draft.isConnected,
          }),
        });
        setSaveMessage({ text: res.ok ? "Settings saved." : "Save failed.", ok: res.ok });
      }
      showToast("Google Reviews settings saved.", "success");
    } catch (err) {
      setSaveMessage({ text: "Save failed. Please try again.", ok: false });
      showToast(err instanceof Error ? err.message : "Failed to save settings.", "error");
    } finally {
      setSaving(false);
    }
  }, [draft, onSave, showToast]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSaveMessage(null);
    try {
      if (onSync) {
        await onSync();
      } else {
        const res = await fetch(SELLER_ENDPOINTS.GOOGLE_REVIEWS_SYNC, {
          method: "POST",
          credentials: "include",
        });
        setSaveMessage({ text: res.ok ? "Sync queued." : "Sync failed.", ok: res.ok });
      }
      showToast("Reviews synced.", "success");
    } catch (err) {
      setSaveMessage({ text: "Sync failed. Please try again.", ok: false });
      showToast(err instanceof Error ? err.message : "Failed to sync reviews.", "error");
    } finally {
      setSyncing(false);
    }
  }, [onSync, showToast]);

  if (loading) {
    return (
      <div className="space-y-4 py-6 px-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-xl border border-zinc-100 dark:border-slate-700 bg-zinc-50 dark:bg-slate-800"
          />
        ))}
      </div>
    );
  }

  const formattedLastSync = draft.lastSyncedAt
    ? new Date(draft.lastSyncedAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Never";

  return (
    <div className="py-4 px-3 sm:px-4 max-w-2xl">
      <Stack gap="lg">
        {/* Settings */}
        <Section>
          <Heading level={3} className="mb-1">Google Business Settings</Heading>
          <Text className="text-sm text-[var(--appkit-color-text-muted)] mb-4">
            Connect your Google Business profile to sync reviews to your storefront.
          </Text>
          <Stack gap="md">
            <Toggle
              checked={draft.isConnected}
              onChange={(v) => setDraft((d) => ({ ...d, isConnected: v }))}
              label="Show Google reviews on my store page"
            />
            <FormField
              name="placeId"
              label="Google Place ID"
              type="text"
              value={draft.placeId}
              onChange={(v) => setDraft((d) => ({ ...d, placeId: v }))}
              placeholder="ChIJ…"
              helpText="Find your Place ID at developers.google.com/maps/documentation/places/web-service/place-id"
            />
            <FormField
              name="businessName"
              label="Business name"
              type="text"
              value={draft.businessName}
              onChange={(v) => setDraft((d) => ({ ...d, businessName: v }))}
              placeholder="Pokémon Palace"
            />
          </Stack>
        </Section>

        {/* Stats */}
        {(draft.averageRating !== undefined || draft.totalReviews !== undefined) && (
          <Section>
            <Heading level={3} className="mb-3">Review Stats</Heading>
            <div className="flex flex-wrap gap-6">
              {draft.averageRating !== undefined && (
                <Div>
                  <Text className="text-xs text-[var(--appkit-color-text-muted)] uppercase tracking-wide">
                    Avg rating
                  </Text>
                  <Text className="text-2xl font-bold tabular-nums">
                    {draft.averageRating.toFixed(1)}
                  </Text>
                </Div>
              )}
              {draft.totalReviews !== undefined && (
                <Div>
                  <Text className="text-xs text-[var(--appkit-color-text-muted)] uppercase tracking-wide">
                    Total reviews
                  </Text>
                  <Text className="text-2xl font-bold tabular-nums">
                    {draft.totalReviews}
                  </Text>
                </Div>
              )}
              <Div>
                <Text className="text-xs text-[var(--appkit-color-text-muted)] uppercase tracking-wide">
                  Last synced
                </Text>
                <Text className="text-sm">{formattedLastSync}</Text>
              </Div>
            </div>
          </Section>
        )}

        {saveMessage && (
          <Alert variant={saveMessage.ok ? "success" : "error"}>
            {saveMessage.text}
          </Alert>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--appkit-color-border)] pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            isLoading={syncing}
            disabled={saving || !draft.placeId.trim()}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {ACTIONS.STORE["google-reviews-sync"].label}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            isLoading={saving}
            disabled={syncing}
          >
            {ACTIONS.STORE["save-google-settings"].label}
          </Button>
        </div>
      </Stack>
    </div>
  );
}
