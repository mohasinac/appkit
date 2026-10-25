"use client";

import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Div } from "../../../ui/components/Div";
import { Heading, Text } from "../../../ui/components/Typography";
import { Stack } from "../../../ui/components/Layout";
import { PaginatedSelect, type PaginatedSelectOption } from "../../../ui/components/PaginatedSelect";
import type { QuickFieldDef } from "../../shell/QuickFormDrawer";
import type { FormValues } from "../../../schemas/types";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS, SELLER_ENDPOINTS } from "../../../constants/api-endpoints";
import { PRODUCT_FEATURE_QUERY_STALE_MS } from "../constants/product-features.constants";
import {
  MAX_FEATURES_PER_PRODUCT,
  type ProductFeatureDocument,
  type ProductFeatureProductType,
} from "../schemas/product-features";

const OVER_LIMIT_BANNER_CLASS =
  "rounded-lg border border-error/20 bg-error-surface px-[var(--appkit-space-3)] py-[var(--appkit-space-2)] text-[length:var(--appkit-text-xs)] text-error";
const EMPTY_STATE_CLASS =
  "rounded-lg border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] px-[var(--appkit-space-3)] py-[var(--appkit-space-4)] text-[length:var(--appkit-text-xs)] text-[var(--appkit-color-text-muted)] text-left";

/** Inline-create form for a store-scope badge. Mirrors productFeatureStoreCreateSchema's required fields. */
const CREATE_FIELDS: QuickFieldDef[] = [
  {
    name: "label",
    label: "Badge label",
    type: "text",
    required: true,
    placeholder: "e.g. Hand-inspected",
    helperText: "Shown on product cards and the detail page.",
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    placeholder: "What this badge promises the buyer.",
  },
  {
    name: "icon",
    label: "Icon",
    type: "text",
    required: true,
    defaultValue: "star",
    helperText: "A Lucide icon name, e.g. star, shield, package.",
  },
];

export interface ProductFeaturesSelectorProps {
  /** Selected feature IDs. */
  value: string[];
  onChange: (next: string[]) => void;
  /** Determines which platform features are eligible. */
  productType: ProductFeatureProductType;
  /** Store ID — when present, store-scope features are also loaded, and the
   *  picker can create new store-scope badges inline. */
  storeId?: string;
  disabled?: boolean;
}

interface FeaturesListResponse {
  items?: ProductFeatureDocument[];
}

function applyProductType(
  list: ProductFeatureDocument[],
  productType: ProductFeatureProductType,
): ProductFeatureDocument[] {
  if (productType === "all") return list;
  return list.filter(
    (f) =>
      f.productTypes.includes("all") || f.productTypes.includes(productType),
  );
}

function unwrapItems(res: unknown): ProductFeatureDocument[] {
  const body =
    (res as { data?: FeaturesListResponse })?.data ??
    (res as FeaturesListResponse);
  return body?.items ?? [];
}

/**
 * Feature-badge picker.
 *
 * 🛑 A SEARCHABLE MULTI-SELECT, not a checkbox grid. This rendered every
 * eligible badge as a two-column grid of bordered checkbox rows — on the real
 * catalogue that is a wall of ~20+ tiles a seller has to read end-to-end to
 * find "Sealed", and it grew every time an admin added a badge. CLAUDE.md's
 * rule is explicit and this was the clearest violation of it left: anything
 * over five options is a `<PaginatedSelect>`, because a long list nobody can
 * search is a list nobody reads.
 *
 * Three things the conversion had to preserve, all of which the grid did by
 * accident and a naive swap would have lost:
 *
 *   - THE SCOPE DISTINCTION. Platform badges are curated and shared; store
 *     badges are the seller's own. The grid showed them under two headings.
 *     `PaginatedSelect` has no option grouping, so the scope rides in the
 *     option label as a suffix — visible in the list AND in the selected chip,
 *     which is strictly more information than the heading gave (a chip used to
 *     say nothing about where its badge came from).
 *   - THE SELECTION CEILING. `MAX_FEATURES_PER_PRODUCT` was enforced by
 *     disabling every unchecked row at the limit. A multi-select has no such
 *     affordance, so the cap is enforced in `handleChange` — which also makes
 *     it correct for a value arriving over the limit from an older document,
 *     where the old code could only show a banner and hope.
 *   - THE DESCRIPTION. Each row carried one. It is folded into the label after
 *     an em-dash so it stays searchable: typing "factory" now finds "Sealed",
 *     whose description is the only place that word appears.
 *
 * Create is wired only when `storeId` is present, and only to the STORE-scope
 * endpoint. `POST /api/admin/features` is `ROLES_ADMIN_ONLY` +
 * `admin:categories:write`, so offering it to a seller would be a control that
 * 403s — worse than an absent one. A seller creating a badge is creating their
 * own, which is exactly what `POST /api/store/features` does (it sets
 * `storeId` server-side rather than trusting the body).
 */
export function ProductFeaturesSelector({
  value,
  onChange,
  productType,
  storeId,
  disabled,
}: ProductFeaturesSelectorProps) {
  const queryClient = useQueryClient();

  const platformQuery = useQuery({
    queryKey: ["product-features", "platform", "active"],
    queryFn: async () =>
      unwrapItems(
        await apiClient.get(
          `${ADMIN_ENDPOINTS.PRODUCT_FEATURES}?scope=platform&isActive=true`,
        ),
      ),
    staleTime: PRODUCT_FEATURE_QUERY_STALE_MS,
  });

  const storeQuery = useQuery({
    queryKey: ["product-features", "store", "active", storeId],
    queryFn: async () =>
      unwrapItems(
        await apiClient.get(
          `${ADMIN_ENDPOINTS.PRODUCT_FEATURES}?scope=store&storeId=${encodeURIComponent(storeId!)}&isActive=true`,
        ),
      ),
    enabled: !!storeId,
    staleTime: PRODUCT_FEATURE_QUERY_STALE_MS,
  });

  const platformFeatures = applyProductType(
    platformQuery.data ?? [],
    productType,
  );
  const storeFeatures = applyProductType(storeQuery.data ?? [], productType);

  const options: PaginatedSelectOption<string>[] = React.useMemo(() => {
    const toOption = (
      f: ProductFeatureDocument,
      scopeSuffix: string,
    ): PaginatedSelectOption<string> => ({
      value: f.id,
      // Description folded in so it is searchable — see the docstring.
      label: f.description
        ? `${f.label} — ${f.description} ${scopeSuffix}`
        : `${f.label} ${scopeSuffix}`,
    });
    return [
      ...platformFeatures.map((f) => toOption(f, "(platform)")),
      ...storeFeatures.map((f) => toOption(f, "(your store)")),
    ];
  }, [platformFeatures, storeFeatures]);

  const atLimit = value.length >= MAX_FEATURES_PER_PRODUCT;
  const overLimit = value.length > MAX_FEATURES_PER_PRODUCT;

  /*
   * 🛑 The cap is applied to the INCOMING array, not to a per-row disabled
   * state. Truncating keeps the earliest selections, which is what a user who
   * has just exceeded the limit expects (the one they clicked last is the one
   * that fails), and it also silently repairs an over-limit value loaded from
   * an older document instead of blocking save behind a banner.
   */
  const handleChange = (next: string[]) => {
    if (disabled) return;
    onChange(
      next.length > MAX_FEATURES_PER_PRODUCT
        ? next.slice(0, MAX_FEATURES_PER_PRODUCT)
        : next,
    );
  };

  /*
   * Create is wired ONLY for a seller editing their own store, and only to the
   * store-scope route — see the component docstring for why offering the admin
   * one here would be a control that 403s.
   *
   * Extracted rather than written inline so the submit handler sits at a
   * readable brace depth; it was five levels deep inside the JSX spread.
   */
  const createBadge = React.useCallback(
    async (values: FormValues): Promise<PaginatedSelectOption<string>> => {
      const created = await apiClient.post(SELLER_ENDPOINTS.FEATURES, {
        label: String(values.label ?? "").trim(),
        description: values.description ? String(values.description).trim() : undefined,
        icon: String(values.icon ?? "star").trim(),
        // Scoped to the type being edited; "all" would quietly widen the badge
        // to every listing type the seller owns.
        productTypes: [productType],
        category: "custom",
        isActive: true,
        displayOrder: 0,
      });
      const doc =
        (created as { data?: ProductFeatureDocument })?.data ??
        (created as unknown as ProductFeatureDocument);
      // Refetch so the new badge becomes a real option rather than a one-off
      // chip that disappears on the next render.
      await queryClient.invalidateQueries({
        queryKey: ["product-features", "store", "active", storeId],
      });
      return { value: doc.id, label: doc.label };
    },
    [productType, queryClient, storeId],
  );

  const createProps = storeId
    ? {
        createLabel: "Create a badge for my store",
        drawerTitle: "New store feature badge",
        createSubmitLabel: "Create badge",
        createFields: CREATE_FIELDS,
        onCreateSubmit: createBadge,
      }
    : {};

  const isLoading = platformQuery.isLoading || (!!storeId && storeQuery.isLoading);
  const hasAny = isLoading || options.length > 0;

  return (
    <Stack gap="sm">
      <Div>
        <Heading
          level={3}
          className="mb-1" color="muted" size="sm" weight="semibold"
        >
          Feature badges
        </Heading>
        <Text size="xs" color="muted">
          Selected: {value.length} of {MAX_FEATURES_PER_PRODUCT}. Badges appear
          on product cards and detail pages.
        </Text>
      </Div>

      {overLimit && (
        <Div className={OVER_LIMIT_BANNER_CLASS}>
          Too many features selected — remove{" "}
          {value.length - MAX_FEATURES_PER_PRODUCT} before saving.
        </Div>
      )}

      {hasAny ? (
        <PaginatedSelect<string>
          multiple
          value={value}
          onChange={handleChange}
          options={options}
          disabled={disabled}
          ariaLabel="Feature badges"
          placeholder={
            atLimit
              ? `All ${MAX_FEATURES_PER_PRODUCT} badge slots used`
              : "Search feature badges…"
          }
          searchPlaceholder="Search badges by name or description…"
          noResultsText="No matching feature badge."
          {...createProps}
        />
      ) : (
        <Div className={EMPTY_STATE_CLASS}>
          No applicable feature badges available.
        </Div>
      )}
    </Stack>
  );
}
