"use client";
import { useCallback, useState } from "react";
import { StackedViewShell } from "../../../ui";
import {
  Alert,
  Div,
  FormField,
  FormGroup,
  Heading,
  Stack,
  Text,
  Toggle,
} from "../../../ui";
import { ImageUpload, useMediaUpload } from "../../media";
import { StepDef, StepForm, useFormShell } from "../../shell";

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
  const [currentStep, setCurrentStep] = useState(0);
  const { markDirty, markClean } = useFormShell();
  const { upload } = useMediaUpload();

  const update = useCallback(
    (partial: Partial<StorefrontDraft>) => {
      setDraft((prev) => ({ ...prev, ...partial }));
      markDirty();
      setSaved(false);
    },
    [markDirty],
  );

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

  const steps: StepDef<StorefrontDraft>[] = [
    {
      label: "Store Identity",
      validate: (values) =>
        !values.storeName?.trim() ? "Store name is required" : null,
      render: ({ values, onChange }) => (
        <Stack gap="md">
          <Heading level={3} className="mb-2">Store Identity</Heading>
          <FormField
            name="storeName"
            label="Store Name"
            type="text"
            value={values.storeName ?? ""}
            onChange={(v) => onChange({ storeName: v })}
            placeholder="e.g. Pokémon Palace"
            disabled={busy}
          />
          <FormField
            name="storeCategory"
            label="Store Category"
            type="text"
            value={values.storeCategory ?? ""}
            onChange={(v) => onChange({ storeCategory: v })}
            placeholder="e.g. Trading Cards, Action Figures"
            disabled={busy}
          />
          <FormField
            name="bio"
            label="Short Bio (shown in search results)"
            type="textarea"
            value={values.bio ?? ""}
            onChange={(v) => onChange({ bio: v })}
            placeholder="One-liner about your store (max 300 chars)"
            disabled={busy}
          />
          <FormField
            name="storeDescription"
            label="Full Description"
            type="textarea"
            value={values.storeDescription ?? ""}
            onChange={(v) => onChange({ storeDescription: v })}
            placeholder="Detailed store description shown on your public store page…"
            disabled={busy}
          />
        </Stack>
      ),
    },
    {
      label: "Branding",
      render: ({ values, onChange }) => (
        <Stack gap="md">
          <Heading level={3} className="mb-2">Branding</Heading>
          <FormGroup columns={2}>
            <ImageUpload
              label="Store Logo"
              currentImage={values.storeLogoURL}
              onUpload={(file) =>
                upload(file, "stores", true, { type: "store-logo", store: storeSlug })
              }
              onChange={(url) => onChange({ storeLogoURL: url })}
              helperText="Square image, min 200×200px"
            />
            <ImageUpload
              label="Store Banner"
              currentImage={values.storeBannerURL}
              onUpload={(file) =>
                upload(file, "stores", true, { type: "store-banner", store: storeSlug })
              }
              onChange={(url) => onChange({ storeBannerURL: url })}
              helperText="Recommended: 1200×300px"
            />
          </FormGroup>
        </Stack>
      ),
    },
    {
      label: "Policies",
      render: ({ values, onChange }) => (
        <Stack gap="md">
          <Heading level={3} className="mb-2">Policies</Heading>
          <FormField
            name="returnPolicy"
            label="Return Policy"
            type="textarea"
            value={values.returnPolicy ?? ""}
            onChange={(v) => onChange({ returnPolicy: v })}
            placeholder="Describe your return policy…"
            disabled={busy}
          />
          <FormField
            name="shippingPolicy"
            label="Shipping Policy"
            type="textarea"
            value={values.shippingPolicy ?? ""}
            onChange={(v) => onChange({ shippingPolicy: v })}
            placeholder="How and when you ship orders…"
            disabled={busy}
          />
        </Stack>
      ),
    },
    {
      label: "Contact & Visibility",
      render: ({ values, onChange }) => (
        <Stack gap="md">
          <Heading level={3} className="mb-2">Contact &amp; Social</Heading>
          <FormGroup columns={2}>
            <FormField
              name="website"
              label="Website"
              type="text"
              value={values.website ?? ""}
              onChange={(v) => onChange({ website: v })}
              placeholder="https://example.com"
              disabled={busy}
            />
            <FormField
              name="location"
              label="Location"
              type="text"
              value={values.location ?? ""}
              onChange={(v) => onChange({ location: v })}
              placeholder="e.g. Mumbai, India"
              disabled={busy}
            />
          </FormGroup>
          <FormGroup columns={2}>
            <FormField
              name="twitter"
              label="Twitter / X URL"
              type="text"
              value={values.socialLinks?.twitter ?? ""}
              onChange={(v) =>
                onChange({ socialLinks: { ...values.socialLinks, twitter: v } })
              }
              placeholder="https://twitter.com/..."
              disabled={busy}
            />
            <FormField
              name="instagram"
              label="Instagram URL"
              type="text"
              value={values.socialLinks?.instagram ?? ""}
              onChange={(v) =>
                onChange({ socialLinks: { ...values.socialLinks, instagram: v } })
              }
              placeholder="https://instagram.com/..."
              disabled={busy}
            />
          </FormGroup>
          <FormGroup columns={2}>
            <FormField
              name="facebook"
              label="Facebook URL"
              type="text"
              value={values.socialLinks?.facebook ?? ""}
              onChange={(v) =>
                onChange({ socialLinks: { ...values.socialLinks, facebook: v } })
              }
              placeholder="https://facebook.com/..."
              disabled={busy}
            />
            <FormField
              name="linkedin"
              label="LinkedIn URL"
              type="text"
              value={values.socialLinks?.linkedin ?? ""}
              onChange={(v) =>
                onChange({ socialLinks: { ...values.socialLinks, linkedin: v } })
              }
              placeholder="https://linkedin.com/..."
              disabled={busy}
            />
          </FormGroup>
          <Heading level={4} className="mt-4 mb-2">Visibility</Heading>
          <Toggle
            checked={values.isPublic !== false}
            onChange={(checked) => onChange({ isPublic: checked })}
            label="Make store public — visible to all buyers"
            disabled={busy}
          />
          {values.isPublic === false && (
            <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
              Your store is hidden. Existing orders are unaffected.
            </Text>
          )}
          <Heading level={4} className="mt-4 mb-2">Vacation Mode</Heading>
          <Toggle
            checked={!!values.isVacationMode}
            onChange={(checked) => onChange({ isVacationMode: checked })}
            label="Enable vacation mode — your store will show a notice to buyers"
            disabled={busy}
          />
          {values.isVacationMode && (
            <FormField
              name="vacationMessage"
              label="Vacation Message"
              type="textarea"
              value={values.vacationMessage ?? ""}
              onChange={(v) => onChange({ vacationMessage: v })}
              placeholder="I'm away until… Orders placed now will ship when I return."
              disabled={busy}
            />
          )}
        </Stack>
      ),
    },
  ];

  return (
    <StackedViewShell
      portal="seller"
      title="Storefront Settings"
      sections={[
        <Div key="stepform">
          {saved && (
            <Alert variant="success" className="mb-6">
              Changes saved successfully.
            </Alert>
          )}
          <StepForm<StorefrontDraft>
            steps={steps}
            values={draft}
            onChange={update}
            onComplete={handleSave}
            formId="seller-storefront"
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            completeLabel="Save Changes"
            isLoading={busy}
          />
        </Div>,
      ]}
    />
  );
}
