"use client";
import { normalizeError } from "../../../errors/normalize";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Alert, Button, Div, Heading, Row, Section, Stack, Text, useToast } from "../../../ui";
import { useFormShellState, FormShellContext, FormErrorSummary } from "../../../ui/forms";
import { applyZodIssues } from "../../../ui/forms/apply-zod-issues";
import { SectionForm, useSectionFormNav, buildSectionsFromSchema, visibleValues } from "../../shell";
import { sellerGoogleReviewsFormSchema } from "../../store-extensions/schemas/google-config-form";
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
  /*
   * Three fields, all derived. The stats below (average rating, total reviews,
   * last sync) are SYNC OUTPUT, not configuration — the schema deliberately
   * omits them, per its own header, so a seller cannot type the review count
   * their storefront displays.
   */
  const sections = useMemo(
    () => buildSectionsFromSchema<GoogleConfigDraft>(sellerGoogleReviewsFormSchema),
    [],
  );
  const nav = useSectionFormNav(sections, draft, { scope: "seller:google-reviews" });
  const { shellCtx, setFieldError, clearErrors, validate } = useFormShellState(
    sellerGoogleReviewsFormSchema,
    {
      sections: nav.sectionMeta,
      onGoToSection: nav.goToSection,
      fieldToSectionIndex: nav.fieldToSectionIndex,
    },
  );

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
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    /*
     * 🛑 The guard is here because `SectionForm.handleSubmit` scrolls to the
     * first erroring section and then calls `onSubmit()` UNCONDITIONALLY — it
     * surfaces errors, it does not block on them.
     */
    clearErrors();
    const parsed = sellerGoogleReviewsFormSchema.safeParse(
      visibleValues(sellerGoogleReviewsFormSchema, draft),
    );
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues, setFieldError);
      return;
    }
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
      void normalizeError(err);
      setSaveMessage({ text: "Save failed. Please try again.", ok: false });
      showToast("Failed to save settings.", "error");
    } finally {
      setSaving(false);
    }
  }, [draft, onSave, showToast, clearErrors, setFieldError]);

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
      void normalizeError(err);
      setSaveMessage({ text: "Sync failed. Please try again.", ok: false });
      showToast("Failed to sync reviews.", "error");
    } finally {
      setSyncing(false);
    }
  }, [onSync, showToast]);

  if (loading) {
    return (
      <Stack gap="md" paddingY="y-lg" paddingX="x-md">
        {Array.from({ length: 3 }).map((_, i) => (
          <Div
            key={i}
            rounded="xl"
            border="default"
            className="h-12 animate-pulse bg-[var(--appkit-color-surface-elevated)]"
          />
        ))}
      </Stack>
    );
  }

  const formattedLastSync = draft.lastSyncedAt
    ? new Date(draft.lastSyncedAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Never";

  return (
    <FormShellContext.Provider value={shellCtx}>
    <Div paddingX="x-sm-md" className="max-w-2xl" padding="y-md">
      <Stack gap="lg">
        {/* Stats */}
        {(draft.averageRating !== undefined || draft.totalReviews !== undefined) && (
          <Section>
            <Heading level={3} className="mb-3">Review Stats</Heading>
            <Row wrap gap="lg">
              {draft.averageRating !== undefined && (
                <Div>
                  <Text className="text-[var(--appkit-color-text-muted)] tracking-wide" size="xs" transform="uppercase">
                    Avg rating
                  </Text>
                  <Text className="tabular-nums" size="2xl" weight="bold">
                    {draft.averageRating.toFixed(1)}
                  </Text>
                </Div>
              )}
              {draft.totalReviews !== undefined && (
                <Div>
                  <Text className="text-[var(--appkit-color-text-muted)] tracking-wide" size="xs" transform="uppercase">
                    Total reviews
                  </Text>
                  <Text className="tabular-nums" size="2xl" weight="bold">
                    {draft.totalReviews}
                  </Text>
                </Div>
              )}
              <Div>
                <Text className="text-[var(--appkit-color-text-muted)] tracking-wide" size="xs" transform="uppercase">
                  Last synced
                </Text>
                <Text size="sm">{formattedLastSync}</Text>
              </Div>
            </Row>
          </Section>
        )}

        {saveMessage && (
          <Alert variant={saveMessage.ok ? "success" : "error"}>
            {saveMessage.text}
          </Alert>
        )}

        <FormErrorSummary />

        <SectionForm<GoogleConfigDraft>
          sections={sections}
          values={draft}
          onChange={(partial) => setDraft((d) => ({ ...d, ...partial }))}
          onSubmit={handleSave}
          onValidationChange={() => validate(draft)}
          schema={sellerGoogleReviewsFormSchema}
          openIds={nav.openIds}
          onOpenChange={nav.setOpenIds}
          submitLabel={ACTIONS.STORE["save-google-settings"].label}
          isLoading={saving}
        />

        {/*
          Sync is an ACTION, not a field, so it stays outside the form: it calls
          a different endpoint, writes nothing the seller typed, and must not be
          gated by form validity.
        */}
        <Row padding="t-md" className="border-t border-[var(--appkit-color-border)]" align="center" justify="start">
          <Button
            gap="sm"
            variant="outline"
            size="sm"
            onClick={handleSync}
            isLoading={syncing}
            disabled={saving || !(draft.placeId ?? "").trim()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {ACTIONS.STORE["google-reviews-sync"].label}
          </Button>
        </Row>
      </Stack>
    </Div>
    </FormShellContext.Provider>
  );
}
