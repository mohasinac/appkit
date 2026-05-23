"use client";
import React, { type ReactNode } from "react";
import { Input } from "../../../ui/components/Input";
import { Textarea } from "../../../ui/components/Textarea";
import { SettingsSection } from "../../../ui/components/SettingsSection";

export interface SeoFieldGroupProps {
  seoTitle: string;
  seoDescription: string;
  slug: string;
  onSeoTitleChange: (next: string) => void;
  onSeoDescriptionChange: (next: string) => void;
  onSlugChange?: (next: string) => void;
  /** Read-only computed canonical URL preview (e.g. `https://letitrip.in/products/<slug>`). */
  canonicalPreview?: string;
  /** Optional section label override. */
  sectionTitle?: ReactNode;
  sectionDescription?: ReactNode;
  disabled?: boolean;
}

const SEO_TITLE_MAX = 60;
const SEO_DESC_MAX = 160;

/**
 * `SeoFieldGroup` — shared SEO inputs (title / description / slug) used across
 * Product, Blog, Category, FAQ editors.
 *
 * W1-15 — extracted 2026-05-23.
 */
export function SeoFieldGroup({
  seoTitle,
  seoDescription,
  slug,
  onSeoTitleChange,
  onSeoDescriptionChange,
  onSlugChange,
  canonicalPreview,
  sectionTitle = "SEO",
  sectionDescription = "Override the auto-generated metadata if needed. Leave blank to use defaults.",
  disabled = false,
}: SeoFieldGroupProps) {
  return (
    <SettingsSection title={sectionTitle} description={sectionDescription}>
      <Input
        label="SEO title"
        value={seoTitle}
        onChange={(e) => onSeoTitleChange(e.target.value)}
        placeholder="Falls back to the page title"
        maxLength={SEO_TITLE_MAX}
        helperText={`Max ${SEO_TITLE_MAX} characters.`}
        disabled={disabled}
      />
      <Textarea
        label="SEO description"
        value={seoDescription}
        onChange={(e) => onSeoDescriptionChange(e.target.value)}
        placeholder="Falls back to the page description"
        maxLength={SEO_DESC_MAX}
        helperText={`Max ${SEO_DESC_MAX} characters.`}
        rows={3}
        disabled={disabled}
      />
      {onSlugChange ? (
        <Input
          label="URL slug"
          value={slug}
          onChange={(e) => onSlugChange(e.target.value)}
          disabled={disabled}
          helperText={canonicalPreview ? `Canonical: ${canonicalPreview}` : undefined}
        />
      ) : null}
    </SettingsSection>
  );
}
