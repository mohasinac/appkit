"use client";

/**
 * Add or edit an item in a user's personal catalogue.
 *
 * Fields come from `createCatalogueItemSchema`'s annotations. Three need a
 * `renderers` entry: the photo list (a real uploader, not the generator's
 * disabled placeholder), and the two taxonomy selects, which are searchable
 * because 47 categories is well past the 5-option threshold.
 *
 * ## `categorySlugs` and `brandSlug` were declared, read, and never collected
 *
 * Both are inherited from `ProductDraftFields` and both are read by
 * `product-from-item.ts`, which builds the marketplace listing when an item is
 * promoted. The hand-rolled form had no control for either, so every promoted
 * listing carried `categorySlugs: []` — and per the Category Tree rules a
 * product with an empty chain is invisible on every category and brand page it
 * should appear under. A schema field with a reader and no control is the
 * inverse of a dead control, and just as silent.
 *
 * `mainImage` is `t1-derive` — the first photo, not a field anyone types. It
 * renders as a read-only preview rather than a text box that could be desynced
 * from the gallery it is supposed to mirror.
 */

import React from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useApiMutation } from "@mohasinac/appkit/client";
import { ACCOUNT_ENDPOINTS, BRAND_ENDPOINTS, CATEGORY_ENDPOINTS } from "../../../constants/api-endpoints";
import { apiClient } from "../../../http";
import { Alert, PaginatedSelect, Stack } from "../../../ui";
import { applyZodIssues } from "../../../ui/forms/apply-zod-issues";
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";
import { FormShellContext, useFormShellState } from "../../../ui/forms/FormShell";
import { buildSectionsFromSchema } from "../../shell/build-sections";
import { SectionForm, useSectionFormNav } from "../../shell/SectionForm";
import { useMediaUpload } from "../../media";
import { MediaUploadList } from "../../media/upload/MediaUploadList";
import type { MediaField } from "../../media/types";
import type { CatalogueItemDocument } from "../schemas/firestore";
import { createCatalogueItemSchema } from "../schemas/validation";

export interface CatalogueItemEditorViewProps {
  item?: CatalogueItemDocument;
  onSaved?: (id: string) => void;
}

interface Values {
  [key: string]: unknown;
  title: string;
  description: string;
  condition: string;
  quantity: number;
  price: number;
  images: string[];
  mainImage: string;
  categorySlugs: string[];
  brandSlug: string;
  visibility: "public" | "private";
}

/** PUBLIC endpoints — this is a buyer surface; the admin ones would 403. */
async function loadOptionsFrom(endpoint: string, query: string, page: number) {
  const params = new URLSearchParams({ page: String(page), pageSize: "25" });
  if (query) params.set("q", query);
  const res = await apiClient.get(`${endpoint}?${params.toString()}`);
  const data = (res as { items?: { id: string; name: string }[]; hasMore?: boolean }) ?? {};
  return {
    items: (data.items ?? []).map((c) => ({ value: c.id, label: c.name })),
    hasMore: data.hasMore ?? false,
  };
}

const loadCategoryOptions = (q: string, p: number) => loadOptionsFrom(CATEGORY_ENDPOINTS.LIST, q, p);
const loadBrandOptions = (q: string, p: number) => loadOptionsFrom(BRAND_ENDPOINTS.LIST, q, p);

export function CatalogueItemEditorView({ item, onSaved }: CatalogueItemEditorViewProps) {
  const isCreate = !item;
  const queryClient = useQueryClient();
  const { upload } = useMediaUpload();
  const uploadIndexRef = React.useRef(0);

  const [form, setForm] = React.useState<Values>({
    title: item?.title ?? "",
    description: item?.description ?? "",
    condition: item?.condition ?? "",
    quantity: item?.quantity ?? 1,
    price: item?.price ?? 0,
    images: item?.images ?? [],
    mainImage: item?.mainImage ?? item?.images?.[0] ?? "",
    categorySlugs: item?.categorySlugs ?? [],
    brandSlug: item?.brandSlug ?? "",
    visibility: item?.visibility ?? "public",
  });

  const handleUpload = React.useCallback(
    async (file: File): Promise<string> => {
      uploadIndexRef.current += 1;
      return upload(file, "catalogue", true, {
        type: "catalogue-image",
        item: form.title || "item",
        index: uploadIndexRef.current,
      });
    },
    [upload, form.title],
  );

  const sections = React.useMemo(
    () =>
      buildSectionsFromSchema<Values>(createCatalogueItemSchema, {
        renderers: {
          images: ({ values, onChange }) => (
            <MediaUploadList
              label="Photos"
              value={(values.images as string[]).map((url) => ({ url, type: "image" }) as MediaField)}
              onChange={(fields) => {
                const urls = fields.map((f) => f.url);
                // `mainImage` is derived, so it moves with the gallery rather
                // than pointing at a photo the user has since removed.
                onChange({ images: urls, mainImage: urls[0] ?? "" });
              }}
              onUpload={handleUpload}
              accept="image/*"
              maxItems={8}
              helperText="Photos older than 30 days must be refreshed before this item can be listed."
            />
          ),
          categorySlugs: ({ values, onChange }) => (
            // Explicit `<string>`: with `multiple`, `value` is `V[]`, so an
            // inferred V reads the array itself as the option type.
            <PaginatedSelect<string>
              multiple
              value={values.categorySlugs as string[]}
              onChange={(v) => onChange({ categorySlugs: (v as string[]) ?? [] })}
              loadOptions={loadCategoryOptions}
              placeholder="Search categories…"
              searchPlaceholder="Type a category name…"
              noResultsText="No categories found"
              ariaLabel="Categories"
            />
          ),
          brandSlug: ({ values, onChange }) => (
            <PaginatedSelect
              value={(values.brandSlug as string) || null}
              onChange={(v) => onChange({ brandSlug: (v as string) ?? "" })}
              loadOptions={loadBrandOptions}
              placeholder="Search brands…"
              searchPlaceholder="Type a brand name…"
              noResultsText="No brands found"
              ariaLabel="Brand"
            />
          ),
        },
      }),
    [handleUpload],
  );

  const nav = useSectionFormNav(sections, form, { scope: "user:catalogue-item" });
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(createCatalogueItemSchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });

  const saveMutation = useApiMutation<CatalogueItemDocument>({
    successMessage: isCreate ? "Added to your catalogue" : "Catalogue item updated",
    errorMessage: isCreate ? "Could not add this item." : "Could not save your changes.",
    mutationFn: async () => {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        condition: form.condition || undefined,
        price: Math.round(Number(form.price) * 100) / 100,
        quantity: Number(form.quantity),
        visibility: form.visibility,
        images: form.images,
        mainImage: form.images[0],
        categorySlugs: form.categorySlugs,
        brandSlug: form.brandSlug || undefined,
      };
      if (isCreate) {
        return apiClient.post<CatalogueItemDocument>(ACCOUNT_ENDPOINTS.CATALOGUE, payload);
      }
      return apiClient.patch<CatalogueItemDocument>(
        ACCOUNT_ENDPOINTS.CATALOGUE_BY_ID(item!.id),
        payload,
      );
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["user", "catalogue"] });
      onSaved?.(saved.id);
    },
  });

  const onSubmit = () => {
    clearErrors();
    const parsed = createCatalogueItemSchema.safeParse({
      ...form,
      price: Math.round(Number(form.price) * 100) / 100,
      quantity: Number(form.quantity),
      brandSlug: form.brandSlug || undefined,
    });
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues, setFieldError);
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Stack gap="md">
      {item?.listingStatus && item.listingStatus !== "not_listed" && (
        <Alert variant="info">
          This item is {item.listingStatus.replace(/_/g, " ")}
          {item.listingStatus === "rejected" && item.rejectionReason
            ? `: ${item.rejectionReason}`
            : "."}
        </Alert>
      )}
      <FormShellContext.Provider value={shellCtx}>
        <FormErrorSummary />
        <SectionForm<Values>
          sections={sections}
          values={form}
          onChange={(partial) => setForm((prev) => Object.assign({}, prev, partial))}
          onSubmit={onSubmit}
          schema={createCatalogueItemSchema}
          openIds={nav.openIds}
          onOpenChange={nav.setOpenIds}
          isLoading={saveMutation.isPending}
          submitLabel={isCreate ? "Add to Catalogue" : "Save Changes"}
        />
      </FormShellContext.Provider>
    </Stack>
  );
}
