"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { PricesOnly } from "../../../ui/components/GatedPrice";
import { Stack } from "../../../ui/components/Layout";
import { Text } from "../../../ui/components/Typography";
import { apiClient } from "../../../http";
import { CATEGORY_ENDPOINTS } from "../../../constants/api-endpoints";
import { formatCurrency } from "../../../utils/number.formatter";
import type { CategoryPriceGuidance } from "../schemas/category-content";
import type { PriceGuidanceBasisNote } from "../../../_internal/shared/features/categories/price-guidance";

interface PriceGuidanceResponse {
  guidance: CategoryPriceGuidance | null;
  basisNote: PriceGuidanceBasisNote | null;
}

function unwrap(res: unknown): PriceGuidanceResponse | null {
  const body =
    (res as { data?: PriceGuidanceResponse })?.data ?? (res as PriceGuidanceResponse);
  return body && typeof body === "object" && "guidance" in body ? body : null;
}

export interface PriceGuidanceHintProps {
  /** Leaf category id/slug the listing is filed under. */
  categoryId: string;
  currency?: string;
  className?: string;
}

/**
 * The seller-facing price hint `description-template/route.ts`'s own
 * docstring names as "C1's job, from a surface that knows who is asking" —
 * renders the inherited competitor-derived market band beside the price
 * field, on the SELLER'S own tax basis (the `/price-guidance` endpoint does
 * that conversion server-side; this component only formats what it returns).
 *
 * Mounted via `ProductForm`'s `renderPriceGuidance` slot rather than fetched
 * unconditionally inside the form — `ProductForm` has no data-fetching of its
 * own (every app-specific concern is a render-prop), and this component is
 * seller/admin-only, not something the form itself should assume a caller
 * wants.
 *
 * 🛑 NEVER mount this on a public page (category/brand detail). A
 * competitor-derived market band is exactly the "a neighbouring surface
 * publishes the range" leak the guest price gate exists to close (CLAUDE.md
 * § "Guest price gating"), even though the figure is advisory rather than a
 * real listing price — which is also why `/price-guidance` itself is
 * seller/admin/moderator-gated, not a public, edge-cached endpoint like its
 * `description-template` sibling.
 */
export function PriceGuidanceHint({
  categoryId,
  currency = "INR",
  className = "",
}: PriceGuidanceHintProps) {
  const query = useQuery({
    queryKey: ["category-price-guidance", categoryId],
    enabled: categoryId.length > 0,
    staleTime: 60 * 60 * 1000,
    queryFn: async () =>
      unwrap(await apiClient.get(CATEGORY_ENDPOINTS.PRICE_GUIDANCE(categoryId))),
  });

  const guidance = query.data?.guidance;
  const basisNote = query.data?.basisNote;
  if (!guidance?.market) return null;

  const { median, p25, p75 } = guidance.market;
  const fmt = (n: number) => formatCurrency(n, currency);
  // p25/p75 are independently optional (see CategoryPriceGuidance's own
  // docstring) — a range renders only when BOTH are present, never a
  // half-range that would misreport the band's shape.
  const range = p25 !== undefined && p75 !== undefined ? ` (${fmt(p25)}–${fmt(p75)})` : "";

  /*
   * `<PricesOnly>` rather than `<GatedPrice>`: this is advisory guidance
   * BESIDE the seller's own price input, not a listing's primary price, so a
   * viewer who may not see prices should get nothing here — a "Sign in to see
   * price" prompt inside a seller form would be nonsense. In practice it
   * never renders for a guest anyway, because the data source
   * (`/api/categories/[id]/price-guidance`) is seller/admin/moderator-gated
   * and 403s before there is a number to format; the wrapper makes that
   * guarantee visible at the render site instead of implied by the route.
   */
  return (
    <PricesOnly>
      <Stack gap="xs" className={className}>
        <Text size="xs" color="muted">
          Market median:{" "}
          <Text as="span" weight="medium" color="primary">
            {fmt(median)}
          </Text>
          {range}
          {basisNote?.suffix ? ` ${basisNote.suffix}` : ""}
        </Text>
        {basisNote?.note && <Text size="xs" color="faint">{basisNote.note}</Text>}
      </Stack>
    </PricesOnly>
  );
}
