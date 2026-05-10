"use client";
import { useCallback, useRef, useState } from "react";
import { StackedViewShell } from "../../../ui";
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
  const logoRef = useRef(0);
  const bannerRef = useRef(0);

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
          <section>
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
                    logoRef.current += 1;
                    return upload(file, "stores", true, {
                      type: "store-logo",
                      name: draft.storeName ?? storeSlug,
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
                    bannerRef.current += 1;
                    return upload(file, "stores", true, {
                      type: "store-banner",
                      name: draft.storeName ?? storeSlug,
                      store: storeSlug,
                    });
                  }}
                  onChange={(url) => update({ storeBannerURL: url })}
                  helperText="Recommended: 1200×300px"
                />
              </FormGroup>
            </Stack>
          </section>

          {/* ── Store Details ─────────────────────────────── */}
          <section>
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
          </section>

          {/* ── Policies ─────────────────────────────────── */}
          <section>
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
          </section>

          {/* ── Contact & Social ──────────────────────────── */}
          <section>
            <Heading level={3} className="mb-4">Contact &amp; Social</Heading>
            <Stack gap="md">
              <FormGroup columns={2}>
                <FormField
                  name="website"
                  label="Website"
                  type="url"
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
                  type="url"
                  value={draft.socialLinks?.twitter ?? ""}
                  onChange={(v) => updateSocial("twitter", v)}
                  placeholder="https://twitter.com/..."
                  disabled={busy}
                />
                <FormField
                  name="instagram"
                  label="Instagram URL"
                  type="url"
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
                  type="url"
                  value={draft.socialLinks?.facebook ?? ""}
                  onChange={(v) => updateSocial("facebook", v)}
                  placeholder="https://facebook.com/..."
                  disabled={busy}
                />
                <FormField
                  name="linkedin"
                  label="LinkedIn URL"
                  type="url"
                  value={draft.socialLinks?.linkedin ?? ""}
                  onChange={(v) => updateSocial("linkedin", v)}
                  placeholder="https://linkedin.com/..."
                  disabled={busy}
                />
              </FormGroup>
            </Stack>
          </section>

          {/* ── Vacation Mode ─────────────────────────────── */}
          <section>
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
          </section>

          {/* ── Visibility ────────────────────────────────── */}
          <section>
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
          </section>

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
