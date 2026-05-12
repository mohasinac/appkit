"use client";

/**
 * BundleForm — SB3-B.
 *
 * Edit/create form for a bundle. Wraps BundleItemsPicker for the items
 * section and uses appkit ui primitives for the rest. Categories/brands are
 * entered as slugs for the v1 cut; rich pickers wire in later.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Div,
  Heading,
  Input,
  Label,
  Row,
  Select,
  type SelectOption,
  Stack,
  Text,
  Textarea,
} from "../../../ui";
import { BundleItemsPicker } from "./BundleItemsPicker";
import {
  BUNDLE_STATUS_OPTIONS,
  BUNDLE_VALIDATION,
  BUNDLES_CURRENCY,
} from "../constants";
import type {
  BundleDocument,
  BundleItem,
  BundleItemListingType,
  BundleStatus,
} from "../schemas/firestore";

export type BundleFormValue = Partial<BundleDocument>;

export interface BundleFormProps {
  storeId: string;
  storeName: string;
  initial?: BundleFormValue;
  isReadonly?: boolean;
  onSubmit: (value: BundleFormValue) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
}

function paiseToRupees(p: number | undefined): string {
  if (!p) return "";
  return (p / 100).toString();
}
function rupeesToPaise(s: string): number {
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function deriveOriginalTotal(items: BundleItem[]): number {
  return items.reduce((sum, it) => sum + it.price * it.quantity, 0);
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
}
function Field({ label, children }: FieldProps) {
  return (
    <Stack className="gap-1">
      <Label>{label}</Label>
      {children}
    </Stack>
  );
}

export function BundleForm({
  storeId,
  storeName,
  initial,
  isReadonly,
  onSubmit,
  onCancel,
  submitLabel = "Save bundle",
}: BundleFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<BundleStatus>(initial?.status ?? "draft");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [categorySlug, setCategorySlug] = useState(initial?.categorySlug ?? "");
  const [subcategory, setSubcategory] = useState(initial?.subcategory ?? "");
  const [brandSlug, setBrandSlug] = useState(initial?.brandSlug ?? "");
  const [tagsCsv, setTagsCsv] = useState((initial?.tags ?? []).join(", "));
  const [coverImagesCsv, setCoverImagesCsv] = useState(
    (initial?.images ?? []).join("\n"),
  );
  const [videoUrl, setVideoUrl] = useState(initial?.video?.url ?? "");
  const [bundleItems, setBundleItems] = useState<BundleItem[]>(
    initial?.bundleItems ?? [],
  );
  const [bundleItemType, setBundleItemType] =
    useState<BundleItemListingType | null>(
      initial?.bundleItemType ?? bundleItems[0]?.listingType ?? null,
    );
  const [bundlePriceR, setBundlePriceR] = useState(
    paiseToRupees(initial?.bundlePrice),
  );
  const [maxPerUser, setMaxPerUser] = useState(
    initial?.maxPerUser?.toString() ?? "",
  );
  const [isFeatured, setIsFeatured] = useState(!!initial?.isFeatured);
  const [isPromoted, setIsPromoted] = useState(!!initial?.isPromoted);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const originalTotal = useMemo(
    () => deriveOriginalTotal(bundleItems),
    [bundleItems],
  );
  const bundlePricePaise = rupeesToPaise(bundlePriceR);
  const savingsPaise = Math.max(0, originalTotal - bundlePricePaise);
  const savingsPct =
    originalTotal > 0 ? Math.round((savingsPaise / originalTotal) * 100) : 0;

  useEffect(() => {
    setBundleItemType(bundleItems[0]?.listingType ?? null);
  }, [bundleItems]);

  const statusOptions: SelectOption<BundleStatus>[] = BUNDLE_STATUS_OPTIONS;

  const validate = (): string | null => {
    if (!title.trim()) return "Title is required.";
    if (bundleItems.length < BUNDLE_VALIDATION.MIN_ITEMS) {
      return `Bundles need at least ${BUNDLE_VALIDATION.MIN_ITEMS} items.`;
    }
    if (bundleItems.length > BUNDLE_VALIDATION.MAX_ITEMS) {
      return `Bundles can have at most ${BUNDLE_VALIDATION.MAX_ITEMS} items.`;
    }
    if (!bundleItemType) return "Bundle item type could not be derived.";
    if (bundlePricePaise <= 0) return "Bundle price must be greater than 0.";
    if (bundlePricePaise > originalTotal) {
      return "Bundle price cannot exceed the original total.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const value: BundleFormValue = {
        ...initial,
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        storeId,
        storeName,
        bundleItemType: bundleItemType!,
        bundleItems,
        bundlePrice: bundlePricePaise,
        bundleOriginalTotal: originalTotal,
        currency: BUNDLES_CURRENCY,
        category: category.trim() || undefined,
        categorySlug: categorySlug.trim() || undefined,
        subcategory: subcategory.trim() || undefined,
        brandSlug: brandSlug.trim() || undefined,
        tags: tagsCsv
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        images: coverImagesCsv
          .split("\n")
          .map((u) => u.trim())
          .filter(Boolean),
        video: videoUrl.trim() ? { url: videoUrl.trim() } : undefined,
        maxPerUser: maxPerUser ? Number(maxPerUser) : undefined,
        isFeatured,
        isPromoted,
        partOfBundleProductIds: bundleItems.map((it) => it.productId),
      };
      await onSubmit(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save bundle.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}

      <Stack className="gap-4">
        <Heading level={3}>Basics</Heading>
        <Field label="Title *">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isReadonly}
            placeholder="Pokémon TCG Starter Pack"
            required
          />
        </Field>
        <Field label="Description">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isReadonly}
            rows={4}
          />
        </Field>
        <Field label="Status">
          <Select<BundleStatus>
            options={statusOptions}
            value={status}
            onValueChange={setStatus}
            disabled={isReadonly}
          />
        </Field>
      </Stack>

      <Stack className="gap-4">
        <Heading level={3}>Items</Heading>
        <BundleItemsPicker
          storeId={storeId}
          value={bundleItems}
          onChange={setBundleItems}
          onTypeChange={setBundleItemType}
          disabled={isReadonly}
        />
      </Stack>

      <Stack className="gap-4">
        <Heading level={3}>Pricing</Heading>
        <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Bundle price (₹) *">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={bundlePriceR}
              onChange={(e) => setBundlePriceR(e.target.value)}
              disabled={isReadonly}
              required
            />
          </Field>
          <Field label="Original total (auto, ₹)">
            <Input value={(originalTotal / 100).toFixed(2)} readOnly />
          </Field>
        </Div>
        {savingsPaise > 0 && (
          <Badge variant="success">
            Save ₹{(savingsPaise / 100).toLocaleString("en-IN")} ({savingsPct}%
            off)
          </Badge>
        )}
      </Stack>

      <Stack className="gap-4">
        <Heading level={3}>Discovery</Heading>
        <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Category">
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isReadonly}
            />
          </Field>
          <Field label="Category slug">
            <Input
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              disabled={isReadonly}
              placeholder="category-action-figures"
            />
          </Field>
          <Field label="Subcategory">
            <Input
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              disabled={isReadonly}
            />
          </Field>
          <Field label="Brand slug">
            <Input
              value={brandSlug}
              onChange={(e) => setBrandSlug(e.target.value)}
              disabled={isReadonly}
              placeholder="brand-pokemon-company"
            />
          </Field>
        </Div>
        <Field label="Tags (comma separated)">
          <Input
            value={tagsCsv}
            onChange={(e) => setTagsCsv(e.target.value)}
            disabled={isReadonly}
          />
        </Field>
      </Stack>

      <Stack className="gap-4">
        <Heading level={3}>Media</Heading>
        <Field label="Cover image URLs (one per line, up to 5)">
          <Textarea
            value={coverImagesCsv}
            onChange={(e) => setCoverImagesCsv(e.target.value)}
            disabled={isReadonly}
            rows={4}
          />
        </Field>
        <Field label="Video URL (optional)">
          <Input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            disabled={isReadonly}
          />
        </Field>
      </Stack>

      <Stack className="gap-4">
        <Heading level={3}>Limits & promotion</Heading>
        <Field label="Max per customer (blank = unlimited)">
          <Input
            type="number"
            min="0"
            value={maxPerUser}
            onChange={(e) => setMaxPerUser(e.target.value)}
            disabled={isReadonly}
          />
        </Field>
        <Checkbox
          checked={isFeatured}
          onChange={(e) => setIsFeatured(e.target.checked)}
          disabled={isReadonly}
          label="Featured"
        />
        <Checkbox
          checked={isPromoted}
          onChange={(e) => setIsPromoted(e.target.checked)}
          disabled={isReadonly}
          label="Promoted"
        />
      </Stack>

      {!isReadonly && (
        <Row className="gap-2 justify-end">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Saving…" : submitLabel}
          </Button>
        </Row>
      )}
    </form>
  );
}
