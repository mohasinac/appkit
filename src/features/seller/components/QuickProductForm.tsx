"use client";
import React, { useState } from "react";
import { Alert, Button, Div, FormField, Stack, Text } from "../../../ui";
import type { SellerProductDraft, SellerProductShellProps } from "./SellerProductShell";

const __P = {
  p5: "p-5",
} as const;

export interface QuickProductFormProps {
  values: SellerProductDraft;
  onChange: (partial: Partial<SellerProductDraft>) => void;
  onPublish: () => void;
  onSave: () => void;
  onSwitchToFull: () => void;
  isLoading: boolean;
  storeSlug?: string;
  renderCategorySelector?: SellerProductShellProps["renderCategorySelector"];
  onUploadImage?: (file: File) => Promise<string>;
}

function toRupees(paise?: number): string {
  return paise != null && paise > 0 ? String(Math.round(paise / 100)) : "";
}
function toPaise(rupeeStr: string): number {
  return Math.round((parseFloat(rupeeStr) || 0) * 100);
}

interface ValidationErrors {
  title?: string;
  price?: string;
  mainImage?: string;
  category?: string;
}

function validate(values: SellerProductDraft): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!values.title?.trim() || (values.title.trim().length < 3)) {
    errors.title = "Title must be at least 3 characters";
  }
  if (!values.price || values.price <= 0) {
    errors.price = "Price is required";
  }
  if (!values.mainImage) {
    errors.mainImage = "Product image is required";
  }
  if (!values.category?.trim()) {
    errors.category = "Category is required";
  }
  return errors;
}

export function QuickProductForm({
  values,
  onChange,
  onPublish,
  onSave,
  onSwitchToFull,
  isLoading,
  renderCategorySelector,
  onUploadImage,
}: QuickProductFormProps) {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState(false);

  const handlePublish = () => {
    setTouched(true);
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      onPublish();
    }
  };

  const handleSave = () => {
    if (!values.title?.trim()) {
      setErrors({ title: "Title is required to save a draft" });
      setTouched(true);
      return;
    }
    onSave();
  };

  return (
    <Stack gap="lg" className={`${__P.p5}`}>
      <Div>
        <Text className="text-zinc-500 dark:text-zinc-400" size="sm">
          Quick add — fill the essentials and publish. You can add more details later.
        </Text>
      </Div>

      {touched && Object.keys(errors).length > 0 && (
        <Alert variant="error">
          Please fix the highlighted fields before publishing.
        </Alert>
      )}

      <FormField
        name="title"
        label="Product Name"
        type="text"
        value={values.title ?? ""}
        onChange={(v) => onChange({ title: v })}
        placeholder="e.g. Charizard Base Set PSA 9"
        required
        error={touched ? errors.title : undefined}
      />

      {renderCategorySelector ? (
        <Div>
          <Text className="text-zinc-700 dark:text-zinc-300 mb-1" size="sm" weight="medium">Category</Text>
          {renderCategorySelector({
            value: values.category ?? "",
            onChange: (v) => onChange({ category: v }),
          })}
          {touched && errors.category && (
            <Text className="text-[var(--appkit-color-error)] mt-1" size="xs">{errors.category}</Text>
          )}
        </Div>
      ) : (
        <FormField
          name="category"
          label="Category"
          type="text"
          value={values.category ?? ""}
          onChange={(v) => onChange({ category: v })}
          placeholder="e.g. Trading Cards"
          error={touched ? errors.category : undefined}
        />
      )}

      <FormField
        name="price"
        label="Price (₹)"
        type="number"
        value={toRupees(values.price)}
        onChange={(v) => onChange({ price: toPaise(v) })}
        placeholder="e.g. 499"
        required
        error={touched ? errors.price : undefined}
      />

      <FormField
        name="mainImage"
        label="Product Image"
        type="image"
        value={values.mainImage ?? ""}
        onChange={(v) => onChange({ mainImage: v })}
        onUpload={onUploadImage}
        required
        error={touched ? errors.mainImage : undefined}
      />

      <FormField
        name="description"
        label="Description"
        type="textarea"
        value={values.description ?? ""}
        onChange={(v) => onChange({ description: v })}
        placeholder="Brief description (optional)"
        rows={3}
      />

      <FormField
        name="stockQuantity"
        label="Stock Quantity"
        type="number"
        value={String(values.stockQuantity ?? 1)}
        onChange={(v) => onChange({ stockQuantity: Math.max(0, parseInt(v, 10) || 0) })}
        placeholder="1"
        hint="How many units are available"
      />

      <Stack className="pt-2" gap="3">
        <Div className="flex gap-3">
          <Button
            variant="primary"
            onClick={handlePublish}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? "Publishing..." : "Publish"}
          </Button>
          <Button
            variant="secondary"
            onClick={handleSave}
            disabled={isLoading}
          >
            Save Draft
          </Button>
        </Div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSwitchToFull}
          className="self-center text-xs"
        >
          Show all fields (advanced)
        </Button>
      </Stack>
    </Stack>
  );
}
