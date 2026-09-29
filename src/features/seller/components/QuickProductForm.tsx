"use client";
import { Row } from "@mohasinac/appkit/ui";
import React, { useState } from "react";
import { Alert, Button, Div, FormField, Stack, Text } from "../../../ui";
import { FormErrorSummary } from "../../../ui/forms";
import type { SellerProductDraft, SellerProductShellProps } from "./SellerProductShell";

const __P = {
  p5: "p-[var(--appkit-space-5)]",
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

function toRupeesString(price?: number): string {
  return price != null && price > 0 ? String(price) : "";
}
function fromRupeesString(rupeeStr: string): number {
  return Math.round((parseFloat(rupeeStr) || 0) * 100) / 100;
}

interface ValidationErrors {
  title?: string;
  price?: string;
  mainImage?: string;
  category?: string;
  description?: string;
}

/**
 * Mirrors `productBaseSchema.description` (`z.string().min(20).max(5000)`).
 *
 * 🛑 This validator already mirrored every other server constraint — title
 * length, price, image, category — and simply omitted description, so the
 * server was the first thing to notice and it answered in Zod's own words:
 * "Invalid input: expected string, received undefined", printed under a field
 * whose placeholder read "(optional)".
 */
const DESCRIPTION_MIN = 20;

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
  const description = values.description?.trim() ?? "";
  if (description.length < DESCRIPTION_MIN) {
    errors.description = `Description must be at least ${DESCRIPTION_MIN} characters`;
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
        <Text size="sm" color="muted">
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
          <Text className="mb-1" color="muted" size="sm" weight="medium">Category</Text>
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
        value={toRupeesString(values.price)}
        onChange={(v) => onChange({ price: fromRupeesString(v) })}
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

      {/*
        * 🛑 DESCRIPTION IS REQUIRED, AND THE PLACEHOLDER USED TO SAY OTHERWISE.
        *
        * `productBaseSchema.description` is `z.string().min(20).max(5000)`, so a
        * listing cannot be created without at least 20 characters — while this
        * field was labelled plainly "Description" and placeheld "Brief
        * description (optional)".
        *
        * Leaving it empty made Publish fail with the raw Zod text **"Invalid
        * input: expected string, received undefined"** rendered under the field.
        * Measured: three consecutive publishes did nothing and said only that,
        * while the dialog stayed open; filling the description published
        * immediately. A seller reading "optional" has no reason to suspect the
        * empty box, and developer text is not an instruction anyone can follow
        * (Rule #9.6).
        *
        * The minimum is stated up front rather than discovered on submit, since
        * a 5-character description fails the same way with a different Zod
        * message.
        */}
      <FormField
        name="description"
        label="Description"
        type="textarea"
        required
        value={values.description ?? ""}
        onChange={(v) => onChange({ description: v })}
        placeholder="What is it, what condition is it in, what is included? (at least 20 characters)"
        rows={3}
        error={touched ? errors.description : undefined}
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

      <Stack gap="3" padding="t-xs">
        <FormErrorSummary />
        <Row gap="3" >
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
        </Row>
        <Button
          variant="ghost"
          size="sm"
          textSize="xs"
          onClick={onSwitchToFull}
          className="self-center"
        >
          Show all fields (advanced)
        </Button>
      </Stack>
    </Stack>
  );
}
