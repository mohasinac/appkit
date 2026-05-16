"use client";
import { useCallback, useState } from "react";
import { Section, StackedViewShell } from "../../../ui";
import {
  Alert,
  Button,
  FormField,
  FormGroup,
  Heading,
  Stack,
  Text,
  Toggle,
} from "../../../ui";
import { ImageUpload, useMediaUpload } from "../../media";
import { useFormShell } from "../../shell";

export interface StorefrontDraft {
  storeName?: string;
  storeDescription?: string;
  storeCategory?: string;
  storeLogoURL?: string;
  storeBannerURL?: string;
  returnPolicy?: string;
  shippingPolicy?: string;
  bio?: string;
  website?: string;
  location?: string;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    linkedin?: string;
  };
  isVacationMode?: boolean;
  vacationMessage?: string;
  isPublic?: boolean;
  googleReviews?: {
    placeId: string;
    enabled: boolean;
    maxReviews?: number;
    minRating?: number;
    layout?: "grid" | "carousel";
  };
}

export interface SellerStorefrontViewProps {
  initialValues?: StorefrontDraft;
  onSave: (data: StorefrontDraft) => void | Promise<void>;
  isLoading?: boolean;
  storeSlug?: string;
}

export function SellerStorefrontView({
  initialValues,
  onSave,
  isLoading = false,
  storeSlug = "store",
}: SellerStorefrontViewProps) {
  const [draft, setDraft] = useState<StorefrontDraft>(initialValues ?? {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { isDirty, markDirty, markClean } = useFormShell();
  const { upload } = useMediaUpload();

  const update = useCallback(
    (partial: Partial<StorefrontDraft>) => {
      setDraft((prev) => ({ ...prev, ...partial }));
      markDirty();
      setSaved(false);
    },
    [markDirty],
  );

  const updateSocial = (key: keyof NonNullable<StorefrontDraft["socialLinks"]>, value: string) => {
    update({ socialLinks: { ...draft.socialLinks, [key]: value } });
  };

  const updateGoogleReviews = (patch: Partial<NonNullable<StorefrontDraft["googleReviews"]>>) => {
    update({
      googleReviews: {
        placeId: draft.googleReviews?.placeId ?? "",
        enabled: draft.googleReviews?.enabled ?? false,
        ...draft.googleReviews,
        ...patch,
      },
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await onSave(draft);
      markClean();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || isLoading;

  return (
    <StackedViewShell
      portal="seller"
      title="Storefront Settings"
      sections={[
        <Stack key="profile" gap="lg">
          {saved && (
            <Alert variant="success">Changes saved successfully.</Alert>
          )}

          {/* ── Store Profile ─────────────────────────────── */}
          <Section>
            <Heading level={3} className="mb-4">Store Profile</Heading>
            <Stack gap="md">
              <FormField
                name="storeName"
                label="Store Name"
                type="text"
                value={draft.storeName ?? ""}
                onChange={(v) => update({ storeName: v })}
                placeholder="e.g. Pokémon Palace"
                disabled={busy}
              />
              <FormField
                name="bio"
                label="Short Bio (shown in search results)"
                type="textarea"
                value={draft.bio ?? ""}
                onChange={(v) => update({ bio: v })}
                placeholder="One-liner about your store (max 300 chars)"
                disabled={busy}
              />
              <FormGroup columns={2}>
                <ImageUpload
                  label="Store Logo"
                  currentImage={draft.storeLogoURL}
                  onUpload={(file) => {
                    return upload(file, "stores", true, {
                      type: "store-logo",
                      store: storeSlug,
                    });
                  }}
                  onChange={(url) => update({ storeLogoURL: url })}
                  helperText="Square image, min 200×200px"
                />
                <ImageUpload
                  label="Store Banner"
                  currentImage={draft.storeBannerURL}
                  onUpload={(file) => {
                    return upload(file, "stores", true, {
                      type: "store-banner",
                      store: storeSlug,
                    });
                  }}
                  onChange={(url) => update({ storeBannerURL: url })}
                  helperText="Recommended: 1200×300px"
                />
              </FormGroup>
            </Stack>
          </Section>

          {/* ── Store Details ─────────────────────────────── */}
          <Section>
            <Heading level={3} className="mb-4">Store Details</Heading>
            <Stack gap="md">
              <FormField
                name="storeCategory"
                label="Store Category"
                type="text"
                value={draft.storeCategory ?? ""}
                onChange={(v) => update({ storeCategory: v })}
                placeholder="e.g. Trading Cards, Action Figures"
                disabled={busy}
              />
              <FormField
                name="storeDescription"
                label="Full Description"
                type="textarea"
                value={draft.storeDescription ?? ""}
                onChange={(v) => update({ storeDescription: v })}
                placeholder="Detailed store description shown on your public store page…"
                disabled={busy}
              />
            </Stack>
          </Section>

          {/* ── Policies ─────────────────────────────────── */}
          <Section>
            <Heading level={3} className="mb-4">Policies</Heading>
            <Stack gap="md">
              <FormField
                name="returnPolicy"
                label="Return Policy"
                type="textarea"
                value={draft.returnPolicy ?? ""}
                onChange={(v) => update({ returnPolicy: v })}
                placeholder="Describe your return policy…"
                disabled={busy}
              />
              <FormField
                name="shippingPolicy"
                label="Shipping Policy"
                type="textarea"
                value={draft.shippingPolicy ?? ""}
                onChange={(v) => update({ shippingPolicy: v })}
                placeholder="How and when you ship orders…"
                disabled={busy}
              />
            </Stack>
          </Section>

          {/* ── Contact & Social ──────────────────────────── */}
          <Section>
            <Heading level={3} className="mb-4">Contact &amp; Social</Heading>
            <Stack gap="md">
              <FormGroup columns={2}>
                <FormField
                  name="website"
                  label="Website"
                  type="text"
                  value={draft.website ?? ""}
                  onChange={(v) => update({ website: v })}
                  placeholder="https://example.com"
                  disabled={busy}
                />
                <FormField
                  name="location"
                  label="Location"
                  type="text"
                  value={draft.location ?? ""}
                  onChange={(v) => update({ location: v })}
                  placeholder="e.g. Mumbai, India"
                  disabled={busy}
                />
              </FormGroup>
              <FormGroup columns={2}>
                <FormField
                  name="twitter"
                  label="Twitter / X URL"
                  type="text"
                  value={draft.socialLinks?.twitter ?? ""}
                  onChange={(v) => updateSocial("twitter", v)}
                  placeholder="https://twitter.com/..."
                  disabled={busy}
                />
                <FormField
                  name="instagram"
                  label="Instagram URL"
                  type="text"
                  value={draft.socialLinks?.instagram ?? ""}
                  onChange={(v) => updateSocial("instagram", v)}
                  placeholder="https://instagram.com/..."
                  disabled={busy}
                />
              </FormGroup>
              <FormGroup columns={2}>
                <FormField
                  name="facebook"
                  label="Facebook URL"
                  type="text"
                  value={draft.socialLinks?.facebook ?? ""}
                  onChange={(v) => updateSocial("facebook", v)}
                  placeholder="https://facebook.com/..."
                  disabled={busy}
                />
                <FormField
                  name="linkedin"
                  label="LinkedIn URL"
                  type="text"
                  value={draft.socialLinks?.linkedin ?? ""}
                  onChange={(v) => updateSocial("linkedin", v)}
                  placeholder="https://linkedin.com/..."
                  disabled={busy}
                />
              </FormGroup>
            </Stack>
          </Section>

          {/* ── Vacation Mode ─────────────────────────────── */}
          <Section>
            <Heading level={3} className="mb-4">Vacation Mode</Heading>
            <Stack gap="md">
              <Toggle
                checked={!!draft.isVacationMode}
                onChange={(checked) => update({ isVacationMode: checked })}
                label="Enable vacation mode — your store will show a notice to buyers"
                disabled={busy}
              />
              {draft.isVacationMode && (
                <FormField
                  name="vacationMessage"
                  label="Vacation Message"
                  type="textarea"
                  value={draft.vacationMessage ?? ""}
                  onChange={(v) => update({ vacationMessage: v })}
                  placeholder="I'm away until… Orders placed now will ship when I return."
                  disabled={busy}
                />
              )}
            </Stack>
          </Section>

          {/* ── Visibility ────────────────────────────────── */}
          <Section>
            <Heading level={3} className="mb-4">Visibility</Heading>
            <Toggle
              checked={draft.isPublic !== false}
              onChange={(checked) => update({ isPublic: checked })}
              label="Make store public — visible to all buyers"
              disabled={busy}
            />
            {draft.isPublic === false && (
              <Text className="mt-2 text-sm text-[var(--appkit-color-text-muted)]">
                Your store is hidden. Existing orders are unaffected.
              </Text>
            )}
          </Section>

          {/* ── Google Business Reviews ───────────────────── */}
          <Section>
            <Heading level={3} className="mb-1">Google Business Reviews</Heading>
            <Text className="text-sm text-[var(--appkit-color-text-muted)] mb-4">
              Display real Google reviews on your store About page. Requires a Google Place ID.
            </Text>
            <Stack gap="md">
              <Toggle
                checked={!!draft.googleReviews?.enabled}
                onChange={(checked) => updateGoogleReviews({ enabled: checked })}
                label="Show Google reviews on my store About page"
                disabled={busy}
              />
              {draft.googleReviews?.enabled && (
                <>
                  <FormField
                    name="googlePlaceId"
                    label="Google Place ID"
                    type="text"
                    value={draft.googleReviews.placeId ?? ""}
                    onChange={(v) => updateGoogleReviews({ placeId: v })}
                    placeholder="ChIJ..."
                    helpText="Find your Place ID at developers.google.com/maps/documentation/places/web-service/place-id"
                    disabled={busy}
                  />
                  <FormGroup columns={2}>
                    <FormField
                      name="googleMaxReviews"
                      label="Max reviews to show"
                      type="number"
                      value={String(draft.googleReviews.maxReviews ?? 6)}
                      onChange={(v) => updateGoogleReviews({ maxReviews: Number(v) })}
                      disabled={busy}
                    />
                    <FormField
                      name="googleMinRating"
                      label="Minimum star rating (1–5)"
                      type="number"
                      value={String(draft.googleReviews.minRating ?? 0)}
                      onChange={(v) => updateGoogleReviews({ minRating: Number(v) })}
                      disabled={busy}
                    />
                  </FormGroup>
                </>
              )}
            </Stack>
          </Section>

          {/* ── Save Button ───────────────────────────────── */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--appkit-color-border)]">
            {isDirty && !saving && (
              <Text className="text-sm text-[var(--appkit-color-text-muted)]">
                You have unsaved changes.
              </Text>
            )}
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={busy || !isDirty}
              isLoading={saving}
            >
              Save Changes
            </Button>
          </div>
        </Stack>,
      ]}
    />
  );
}
