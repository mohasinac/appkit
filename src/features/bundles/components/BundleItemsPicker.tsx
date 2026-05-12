"use client";

/**
 * BundleItemsPicker — SB3-A.
 *
 * Lets the seller pick 3–16 products from their own store to assemble a
 * bundle. Bundles are homogeneous: the first item added locks the
 * `bundleItemType` (`"standard"` or `"pre-order"`). Auctions and prize draws
 * are intentionally excluded — the picker filters them out at the data source.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Badge,
  Div,
  Input,
  Modal,
  Row,
  Select,
  Stack,
  Text,
} from "../../../ui";
import { useProducts } from "../../products/hooks/useProducts";
import {
  BUNDLE_ITEM_TYPE_LABEL,
  BUNDLE_ITEM_TYPE_OPTIONS,
  BUNDLE_VALIDATION,
} from "../constants";
import type { ProductItem } from "../../products/types";
import type {
  BundleItem,
  BundleItemListingType,
} from "../schemas/firestore";

export interface BundleItemsPickerProps {
  storeId: string;
  value: BundleItem[];
  onChange: (next: BundleItem[]) => void;
  onTypeChange?: (type: BundleItemListingType | null) => void;
  disabled?: boolean;
}

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function pickListingType(p: ProductItem): BundleItemListingType {
  return p.listingType === "pre-order" ? "pre-order" : "standard";
}

export function BundleItemsPicker({
  storeId,
  value,
  onChange,
  onTypeChange,
  disabled,
}: BundleItemsPickerProps) {
  const lockedType: BundleItemListingType | null = value[0]?.listingType ?? null;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filterType, setFilterType] = useState<BundleItemListingType>(
    lockedType ?? "standard",
  );
  const [search, setSearch] = useState("");

  useEffect(() => {
    onTypeChange?.(lockedType);
  }, [lockedType, onTypeChange]);

  const { products, isLoading } = useProducts(
    {
      storeId,
      listingType: filterType,
      status: "published",
      perPage: 100,
    },
    { enabled: pickerOpen },
  );

  const selectedIds = useMemo(
    () => new Set(value.map((it) => it.productId)),
    [value],
  );

  const candidates = useMemo<ProductItem[]>(() => {
    const term = search.trim().toLowerCase();
    return (products ?? [])
      .filter((p) => !selectedIds.has(p.id))
      .filter((p) =>
        term ? (p.title ?? "").toLowerCase().includes(term) : true,
      )
      .slice(0, BUNDLE_VALIDATION.MAX_PICKER_RESULTS);
  }, [products, selectedIds, search]);

  const atMax = value.length >= BUNDLE_VALIDATION.MAX_ITEMS;
  const belowMin = value.length < BUNDLE_VALIDATION.MIN_ITEMS;

  const addItem = (p: ProductItem) => {
    if (atMax) return;
    const itemType = pickListingType(p);
    if (lockedType && itemType !== lockedType) return;
    const images = (p.images ?? []).slice(0, BUNDLE_VALIDATION.MAX_ITEM_IMAGES);
    const next: BundleItem = {
      productId: p.id,
      productSlug: (p as { slug?: string }).slug ?? p.id,
      title: p.title ?? p.id,
      listingType: itemType,
      images,
      video:
        (p as { video?: { url: string; thumbnailUrl?: string } }).video ??
        undefined,
      price: typeof p.price === "number" ? p.price : 0,
      quantity: 1,
      isSold: false,
    };
    onChange([...value, next]);
  };

  const updateQty = (productId: string, qty: number) => {
    onChange(
      value.map((it) =>
        it.productId === productId ? { ...it, quantity: Math.max(1, qty) } : it,
      ),
    );
  };

  const removeItem = (productId: string) => {
    onChange(value.filter((it) => it.productId !== productId));
  };

  return (
    <Stack className="gap-3">
      <Row className="items-center justify-between flex-wrap gap-2">
        <Text className="font-semibold">
          Bundle items ({value.length}/{BUNDLE_VALIDATION.MAX_ITEMS})
        </Text>
        <Row className="items-center gap-2">
          {lockedType && (
            <Badge variant="secondary">
              {BUNDLE_ITEM_TYPE_LABEL[lockedType]} bundle
            </Badge>
          )}
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || atMax}
            onClick={() => setPickerOpen(true)}
          >
            + Add item
          </Button>
        </Row>
      </Row>

      {belowMin && (
        <Text className="text-sm text-[var(--appkit-color-danger,#ef4444)]">
          Minimum {BUNDLE_VALIDATION.MIN_ITEMS} items required to publish this
          bundle.
        </Text>
      )}

      {value.length === 0 ? (
        <Div className="rounded border border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-center">
          <Text className="text-[var(--appkit-color-text-muted,#6b7280)]">
            No items yet. Click <strong>Add item</strong> to choose from your
            store's standard or pre-order products. Auctions and prize draws are
            not eligible for bundles.
          </Text>
        </Div>
      ) : (
        <Stack className="gap-2">
          {value.map((it) => (
            <Row
              key={it.productId}
              className={`items-center gap-3 rounded border border-zinc-200 dark:border-zinc-700 p-2 ${it.isSold ? "opacity-60" : ""}`}
            >
              <Div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                {it.images?.[0] && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={it.images[0]}
                    alt={it.title}
                    className="h-full w-full object-cover"
                  />
                )}
                {it.isSold && (
                  <Div className="absolute inset-0 grid place-items-center bg-black/50">
                    <Text className="text-xs font-semibold text-white">
                      Sold
                    </Text>
                  </Div>
                )}
              </Div>
              <Stack className="min-w-0 flex-1 gap-1">
                <Text className="truncate font-medium">{it.title}</Text>
                <Row className="items-center gap-2 text-xs">
                  <Badge variant="secondary">
                    {BUNDLE_ITEM_TYPE_LABEL[it.listingType]}
                  </Badge>
                  <Text className="text-[var(--appkit-color-text-muted,#6b7280)]">
                    {formatPaise(it.price)} · qty {it.quantity}
                  </Text>
                </Row>
              </Stack>
              <Row className="items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled || it.isSold || it.quantity <= 1}
                  onClick={() => updateQty(it.productId, it.quantity - 1)}
                  aria-label="Decrease quantity"
                >
                  −
                </Button>
                <Text className="w-6 text-center text-sm">{it.quantity}</Text>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled || it.isSold}
                  onClick={() => updateQty(it.productId, it.quantity + 1)}
                  aria-label="Increase quantity"
                >
                  +
                </Button>
              </Row>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || it.isSold}
                onClick={() => removeItem(it.productId)}
                aria-label="Remove item"
              >
                Remove
              </Button>
            </Row>
          ))}
        </Stack>
      )}

      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        size="lg"
        title="Add bundle items"
      >
        <Stack className="gap-3">
          <Row className="gap-2 flex-wrap">
            <Select<BundleItemListingType>
              options={BUNDLE_ITEM_TYPE_OPTIONS}
              value={filterType}
              onValueChange={setFilterType}
              disabled={!!lockedType}
            />
            <Input
              placeholder="Search by title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
          </Row>

          {lockedType && (
            <Text className="text-xs text-[var(--appkit-color-text-muted,#6b7280)]">
              Bundle type is locked to {BUNDLE_ITEM_TYPE_LABEL[lockedType]} after
              the first item. Remove all items to reset.
            </Text>
          )}

          {isLoading ? (
            <Text>Loading store products…</Text>
          ) : candidates.length === 0 ? (
            <Text className="text-[var(--appkit-color-text-muted,#6b7280)]">
              No matching{" "}
              {BUNDLE_ITEM_TYPE_LABEL[filterType].toLowerCase()} products in
              your store.
            </Text>
          ) : (
            <Stack className="gap-2 max-h-[50vh] overflow-y-auto">
              {candidates.map((p) => (
                <Row
                  key={p.id}
                  className="items-center gap-3 rounded border border-zinc-200 dark:border-zinc-700 p-2"
                >
                  <Div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                    {p.images?.[0] && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={p.images[0]}
                        alt={p.title ?? p.id}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </Div>
                  <Stack className="min-w-0 flex-1 gap-1">
                    <Text className="truncate text-sm font-medium">
                      {p.title ?? p.id}
                    </Text>
                    <Text className="text-xs text-[var(--appkit-color-text-muted,#6b7280)]">
                      {formatPaise(typeof p.price === "number" ? p.price : 0)}
                    </Text>
                  </Stack>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={atMax}
                    onClick={() => addItem(p)}
                  >
                    Add
                  </Button>
                </Row>
              ))}
            </Stack>
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
