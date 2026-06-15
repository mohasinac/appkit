"use client";
// S-STORE — Grid + list card views for SellerProductsView. Extracted so the
// main component stays under the 150-line code-quality threshold.

import React from "react";
import { Badge, Button, Div, Row, Text } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { ROW_ACTION_META, ROW_ACTION_ID } from "../../../features/products/constants/action-defs";
import { CARD_BORDER, CARD_BORDER_ACTIVE, CARD_GRID_CLS, CARD_LIST_CLS, KIND_BADGE_VARIANT } from "./seller-products-styles";

const __P = {
  p3: "p-3",
} as const;

const __O = {
  hidden: "overflow-hidden",
} as const;

export interface SellerProductsCardsRowShape {
  id: string;
  primary: string;
  secondary: string;
  imageUrl?: string;
  listingKind: string;
}

export interface SellerProductsCardsProps<TRow extends SellerProductsCardsRowShape> {
  view: "grid" | "list";
  rows: TRow[];
  isLoading: boolean;
  listingKind: string;
  selectedIds: Set<string>;
  toggle: (id: string) => void;
  onEdit: (row: TRow) => void;
  onDuplicate: (row: TRow) => void;
  onDelete?: (row: TRow) => void;
}

function buildHref(row: SellerProductsCardsRowShape): string {
  if (row.listingKind === "auction") return `/auctions/${row.id}`;
  if (row.listingKind === "pre-order") return `/pre-orders/${row.id}`;
  return `/products/${row.id}`;
}

export function SellerProductsCards<TRow extends SellerProductsCardsRowShape>({
  view,
  rows,
  isLoading,
  listingKind,
  selectedIds,
  toggle,
  onEdit,
  onDuplicate,
  onDelete,
}: SellerProductsCardsProps<TRow>) {
  return (
    <Div className={view === "grid" ? CARD_GRID_CLS : CARD_LIST_CLS}>
      {rows.length === 0 && !isLoading && (
        <Text className="text-[var(--appkit-color-text-muted)] col-span-full" size="sm">
          {listingKind !== "all" ? `No ${listingKind} listings found` : "No products listed yet"}
        </Text>
      )}
      {rows.map((row) => {
        const isSelected = selectedIds.has(row.id);
        const href = buildHref(row);
        const borderCls = isSelected ? CARD_BORDER_ACTIVE : CARD_BORDER;
        return view === "grid" ? (
          <Div
            key={row.id}
            className={`group relative border bg-[var(--appkit-color-surface)] overflow-hidden hover:shadow-md transition-shadow ${borderCls}`} rounded="xl"
          >
            <Div className="absolute top-2 left-2 z-10">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(row.id)}
                className="h-4 w-4 rounded border-[var(--appkit-color-border)]"
                onClick={(e) => e.stopPropagation()}
                aria-label="Select"
              />
            </Div>
            <a href={href} className="block">
              <Div className="w-full aspect-square">
                <MediaImage src={row.imageUrl} alt={row.primary} size="card" />
              </Div>
              <Div className={`${__P.p3} space-y-1`}>
                <Text className="line-clamp-1" size="sm" weight="medium">{row.primary}</Text>
                <Row gap="sm">
                  <Badge variant={KIND_BADGE_VARIANT[row.listingKind] ?? "default"}>{row.listingKind}</Badge>
                  <Text className="text-[var(--appkit-color-text-muted)] line-clamp-1" size="xs">{row.secondary}</Text>
                </Row>
              </Div>
            </a>
            <Row className="border-t border-[var(--appkit-color-border)]" justify="end" gap="xs" padding="xs">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(row); }} aria-label="Edit">{ROW_ACTION_META[ROW_ACTION_ID.EDIT].label}</Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDuplicate(row); }} aria-label="Duplicate">{ROW_ACTION_META[ROW_ACTION_ID.DUPLICATE].label}</Button>
              {onDelete && (
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(row); }} aria-label="Delete">{ROW_ACTION_META[ROW_ACTION_ID.DELETE].label}</Button>
              )}
            </Row>
          </Div>
        ) : (
          <Div
            key={row.id}
            className={`flex items-center gap-3 border bg-[var(--appkit-color-surface)] px-3 hover:bg-[var(--appkit-color-surface-raised)] ${borderCls}`} rounded="lg" padding="y-xs"
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggle(row.id)}
              className="h-4 w-4 rounded border-[var(--appkit-color-border)]"
              aria-label="Select"
            />
            <Div className={`w-12 h-12 ${__O.hidden}`} rounded="default">
              <MediaImage src={row.imageUrl} alt={row.primary} size="thumbnail" />
            </Div>
            <a href={href} className="flex-1 min-w-0">
              <Text className="line-clamp-1" size="sm" weight="medium">{row.primary}</Text>
              <Row gap="sm">
                <Badge variant={KIND_BADGE_VARIANT[row.listingKind] ?? "default"}>{row.listingKind}</Badge>
                <Text className="text-[var(--appkit-color-text-muted)] line-clamp-1" size="xs">{row.secondary}</Text>
              </Row>
            </a>
            <Row className="flex-shrink-0" gap="xs">
              <Button variant="ghost" size="sm" onClick={() => onEdit(row)} aria-label="Edit">{ROW_ACTION_META[ROW_ACTION_ID.EDIT].label}</Button>
              <Button variant="ghost" size="sm" onClick={() => onDuplicate(row)} aria-label="Duplicate">{ROW_ACTION_META[ROW_ACTION_ID.DUPLICATE].label}</Button>
              {onDelete && (
                <Button variant="ghost" size="sm" onClick={() => onDelete(row)} aria-label="Delete">{ROW_ACTION_META[ROW_ACTION_ID.DELETE].label}</Button>
              )}
            </Row>
          </Div>
        );
      })}
    </Div>
  );
}
