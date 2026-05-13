"use client";

/**
 * AdminBundlesView — S-SBUNI-4 2026-05-13.
 *
 * Simple admin list for categoryType:"bundle" rows. Fetches /api/admin/bundles
 * on mount, renders a table with name + price + member-count + stock + status,
 * and surfaces edit / new CTAs via consumer-provided href builders.
 *
 * Intentionally lighter than AdminCategoriesView (no ListingToolbar / SideDrawer /
 * panel-url sync) because bundles are admin-only + low cardinality. Upgrade
 * paths to the full pattern remain open if volume grows.
 */

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Container,
  Div,
  Heading,
  Row,
  Section,
  Stack,
  Text,
} from "../../../ui";
import {
  BUNDLE_COPY,
  BUNDLE_STOCK_VARIANT,
} from "../../../_internal/shared/features/categories/bundle-copy";
import type { CategoryDocument } from "../../categories/schemas";

export interface AdminBundlesViewProps {
  /** Builds the href for the row-click edit action. */
  getEditHref: (row: { id: string }) => string;
  /** Builds the href for the "New bundle" CTA. */
  newHref: string;
}

const STOCK_LIST_LABEL: Record<
  NonNullable<CategoryDocument["bundleStockStatus"]>,
  string
> = {
  in_stock: BUNDLE_COPY.stockBadge.listVariantInStock,
  partial: BUNDLE_COPY.stockBadge.listVariantPartial,
  out_of_stock: BUNDLE_COPY.stockBadge.listVariantOutOfStock,
};

function formatPrice(paise: number | undefined | null): string {
  if (typeof paise !== "number" || paise <= 0) return "—";
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export function AdminBundlesView({
  getEditHref,
  newHref,
}: AdminBundlesViewProps) {
  const [bundles, setBundles] = useState<CategoryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bundles?activeOnly=false&limit=200`);
      if (!res.ok) throw new Error(`Load failed: ${res.status}`);
      const json = (await res.json()) as {
        data?: { items?: CategoryDocument[] };
      };
      setBundles(json?.data?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Section className="py-10">
      <Container size="xl">
        <Stack gap="lg">
          <Row gap="sm" align="center" justify="between" className="flex-wrap">
            <Heading
              level={1}
              className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {BUNDLE_COPY.adminListTitle}
            </Heading>
            <Button asChild variant="primary">
              <Link href={newHref}>{BUNDLE_COPY.adminList.newButton}</Link>
            </Button>
          </Row>

          {error && (
            <Text color="danger" role="alert">
              {error}
            </Text>
          )}

          {loading ? (
            <Text>{BUNDLE_COPY.adminList.loading}</Text>
          ) : bundles.length === 0 ? (
            <Div className="rounded-2xl border border-dashed border-zinc-200 py-16 text-center dark:border-zinc-700">
              <Text color="muted">{BUNDLE_COPY.adminList.empty}</Text>
            </Div>
          ) : (
            <Div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-left dark:bg-zinc-900">
                  <tr>
                    <th className="px-3 py-2 font-semibold">
                      {BUNDLE_COPY.adminList.columns.name}
                    </th>
                    <th className="px-3 py-2 font-semibold">
                      {BUNDLE_COPY.adminList.columns.price}
                    </th>
                    <th className="px-3 py-2 font-semibold">
                      {BUNDLE_COPY.adminList.columns.members}
                    </th>
                    <th className="px-3 py-2 font-semibold">
                      {BUNDLE_COPY.adminList.columns.stock}
                    </th>
                    <th className="px-3 py-2 font-semibold">
                      {BUNDLE_COPY.adminList.columns.status}
                    </th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {bundles.map((b) => {
                    const stockKey = b.bundleStockStatus ?? "in_stock";
                    const memberCount = b.bundleProductIds?.length ?? 0;
                    return (
                      <tr
                        key={b.id}
                        className="border-t border-zinc-100 dark:border-zinc-800"
                      >
                        <td className="px-3 py-2">
                          <Stack gap="xs">
                            <Text size="sm" weight="medium">
                              {b.name}
                            </Text>
                            <Text size="xs" color="muted">
                              {b.slug}
                            </Text>
                          </Stack>
                        </td>
                        <td className="px-3 py-2">
                          {formatPrice(b.bundlePriceInPaise)}
                        </td>
                        <td className="px-3 py-2">{memberCount}</td>
                        <td className="px-3 py-2">
                          <Badge variant={BUNDLE_STOCK_VARIANT[stockKey]}>
                            {STOCK_LIST_LABEL[stockKey]}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={b.isActive ? "success" : "default"}>
                            {b.isActive
                              ? BUNDLE_COPY.adminList.activeBadge
                              : BUNDLE_COPY.adminList.inactiveBadge}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={getEditHref({ id: b.id })}>
                              {BUNDLE_COPY.adminList.editLabel}
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Div>
          )}
        </Stack>
      </Container>
    </Section>
  );
}
