"use client";

import React, { useMemo, useState } from "react";
import { Heading, Text } from "../../../ui/components/Typography";
import { Stack, Row } from "../../../ui/components/Layout";
import { Button } from "../../../ui/components/Button";
import { FieldCheckbox } from "../../../ui/forms/FieldCheckbox";
import {
  formatPhysicalLocation,
  type PhysicalLocationParts,
} from "../../../utils/physical-location";
import {
  LabelPageStyle,
  LabelSheet,
  ProductLabel,
  PrintScaleWarning,
} from "../../print/components/labels";
import { LabelProfilePicker } from "../../print/components/LabelProfilePicker";
import {
  LABEL_PROFILES,
  documentPageCss,
  labelPageCss,
  type LabelProfileId,
} from "../../../_internal/shared/features/print/label-profiles";
import { formatMoney } from "../../../utils/number.formatter";

interface PrintCenterStore {
  id: string;
  storeName: string;
  storeDescription?: string;
  storeLogoURL?: string;
  storeCategory?: string;
}

interface PrintCenterProduct {
  id: string;
  name: string;
  price: number;
  slug: string;
  listingType?: string;
  condition?: string;
  stockCount?: number;
  /* 🛑 An OBJECT, not a string. This was declared `string` while
   * `PrintCenterPanel` passed the raw `{zone, shelf, bin}` straight through,
   * so the render below put an object into JSX — "Objects are not valid as a
   * React child". Both mappers there are `(x: any)` and the products array is
   * cast `as any`, which is why neither side complained. */
  physicalLocation?: PhysicalLocationParts;
  barcodeId?: string;
  /**
   * The storage box this product is placed in, from the placements registry.
   * Preferred over `physicalLocation` on the label — see the render note.
   */
  boxCode?: string | null;
}

interface PrintCenterOrder {
  id: string;
  createdAt: string;
  status: string;
  buyerDisplayName?: string;
  buyerCity?: string;
  items: { productName: string; quantity: number; price: number; barcodeId?: string }[];
  /* 🛑 An OBJECT, not a string. This was declared `string` while
   * `PrintCenterPanel` passed the raw `{zone, shelf, bin}` straight through,
   * so the render below put an object into JSX — "Objects are not valid as a
   * React child". Both mappers there are `(x: any)` and the products array is
   * cast `as any`, which is why neither side complained. */
  physicalLocation?: PhysicalLocationParts;
}

interface PrintCenterViewProps {
  store?: PrintCenterStore | null;
  publicBaseUrl?: string;
  isAdmin?: boolean;
  brandName?: string;
  initialProducts?: PrintCenterProduct[];
  initialOrders?: PrintCenterOrder[];
}

/*
 * 🛑 THE LOCAL `ProductLabel` IS GONE. It was `w-[200px]`, rendered a barcode
 * at `width: 2` (a 0.53 mm module — twice the density needed) with a fixed
 * `margin: 8` quiet zone (4 modules against the 10 the symbology requires),
 * and this view emitted no `@page` rule at all. So a thermal printer received
 * the browser's default A4 with a 200-pixel card in the corner, and nothing
 * errored.
 *
 * `features/print/components/labels.tsx` replaces it with mm geometry driven
 * by the chosen profile. See that file's header for the two unit conversions,
 * and `label-profiles.ts` for why the fit check refuses rather than scales.
 */

function PackingSlip({ order, brandName }: { order: PrintCenterOrder; brandName: string }) {
  return (
    <Stack surface="card" padding="md" rounded="sm" className="break-inside-avoid mb-4 max-w-[480px]">
      <Row justify="between" className="mb-2">
        <Heading level={5}>{brandName}</Heading>
        <Text size="xs" color="muted">#{order.id}</Text>
      </Row>
      <Text size="xs" color="muted">{new Date(order.createdAt).toLocaleDateString("en-IN")}</Text>
      {order.buyerDisplayName && <Text size="sm" weight="medium">{order.buyerDisplayName}</Text>}
      {order.buyerCity && <Text size="xs" color="muted">{order.buyerCity}</Text>}
      {formatPhysicalLocation(order.physicalLocation) && (
        <Text size="xs" color="muted">
          Staging: {formatPhysicalLocation(order.physicalLocation)}
        </Text>
      )}
      <Stack border="top" padding="t-xs" className="mt-3">
        {order.items.map((item, i) => (
          <Row key={i} justify="between" padding="y-2xs" className="border-b last:border-b-0">
            <Stack gap="xs">
              <Text size="xs" weight="medium">{item.productName}</Text>
              {item.barcodeId && <Text size="xs" color="muted">{item.barcodeId}</Text>}
            </Stack>
            <Stack className="text-right">
              <Text size="xs">×{item.quantity}</Text>
              <Text size="xs" color="muted">{formatMoney(item.price)}</Text>
            </Stack>
          </Row>
        ))}
      </Stack>
    </Stack>
  );
}

export function PrintCenterView({
  store,
  brandName = "LetItRip",
  initialProducts = [],
  initialOrders = [],
}: PrintCenterViewProps) {
  const [tab, setTab] = useState<"labels" | "slips">("labels");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [profileId, setProfileId] = useState<LabelProfileId>("thermal-50x25");
  const profile = LABEL_PROFILES[profileId];

  const chosenProducts = useMemo(
    () => initialProducts.filter((p) => selectedProducts.has(p.id)),
    [initialProducts, selectedProducts],
  );

  /*
   * The LONGEST code in the selection, so the fit warning is about the worst
   * label in the batch. Checking the first or the average would report "fits"
   * about a job in which some labels do not — and the operator only finds out
   * which ones after printing.
   */
  const longestCodeLength = useMemo(
    () =>
      chosenProducts.reduce(
        (n, p) => Math.max(n, (p.barcodeId ?? "").length),
        0,
      ),
    [chosenProducts],
  );

  const toggleProduct = (id: string) =>
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleOrder = (id: string) =>
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const printSelected = () => window.print();

  return (
    <Stack gap="md" padding="md">
      {/*
        🛑 ONE `@page` OWNER, SWITCHED BY TAB. The rule is document-global and
        cannot be scoped, so two of these would not give two geometries — the
        later one in document order silently wins. Only one tab renders at a
        time, which is exactly what makes a single conditional emitter correct:
        labels want the label as the page, packing slips want A4.
      */}
      <LabelPageStyle
        css={tab === "labels" ? labelPageCss(profile) : documentPageCss()}
      />

      <Stack className="no-print">
        <Heading level={3}>Print Center{store ? ` — ${store.storeName}` : ""}</Heading>
        <Row gap="xs" className="mt-3">
          <Button
            onClick={() => setTab("labels")}
            variant={tab === "labels" ? "primary" : "secondary"}
            size="sm"
          >
            Product Labels
          </Button>
          <Button
            onClick={() => setTab("slips")}
            variant={tab === "slips" ? "primary" : "secondary"}
            size="sm"
          >
            Packing Slips
          </Button>
        </Row>
      </Stack>

      {tab === "labels" && (
        <>
          <Stack className="no-print" gap="sm">
            <LabelProfilePicker
              value={profileId}
              onChange={setProfileId}
              longestCodeLength={longestCodeLength}
            />
            <PrintScaleWarning />
            <Stack gap="sm">
              {initialProducts.length === 0 ? (
                <Text color="muted">No products available.</Text>
              ) : (
                initialProducts.map((p) => (
                  <FieldCheckbox
                    key={p.id}
                    name={`product-${p.id}`}
                    label={p.name}
                    checked={selectedProducts.has(p.id)}
                    onChange={() => toggleProduct(p.id)}
                  />
                ))
              )}
              <Button onClick={printSelected} disabled={selectedProducts.size === 0}>
                Print Selected ({selectedProducts.size})
              </Button>
            </Stack>
          </Stack>
          {/*
            `LabelSheet` positions on a die-cut A4 grid at the stock's real
            pitch, and passes thermal straight through — there the page IS the
            label and `@page` plus `break-after` does the work.
          */}
          <LabelSheet profile={profile}>
            {chosenProducts.map((p) => (
              <ProductLabel
                key={p.id}
                profile={profile}
                product={{
                  barcodeId: p.barcodeId,
                  name: p.name,
                  price: p.price,
                  /*
                   * 🛑 The BOX CODE, falling back to the legacy free-text
                   * location. `boxCode` comes from the placements registry, so
                   * it is one of a known set and groups correctly;
                   * `physicalLocation` was three uncontrolled inputs where
                   * "shelf 3", "Shelf-3" and "AC60 3" all meant one place and
                   * no list could group them. The fallback keeps old products
                   * printing something until that field is retired.
                   */
                  boxCode:
                    p.boxCode ?? formatPhysicalLocation(p.physicalLocation) ?? null,
                }}
              />
            ))}
          </LabelSheet>
        </>
      )}

      {tab === "slips" && (
        <>
          <Stack className="no-print">
            <Stack gap="sm">
              {initialOrders.length === 0 ? (
                <Text color="muted">No orders available.</Text>
              ) : (
                initialOrders.map((o) => (
                  <FieldCheckbox
                    key={o.id}
                    name={`order-${o.id}`}
                    label={`#${o.id}${o.buyerDisplayName ? ` — ${o.buyerDisplayName}` : ""}`}
                    checked={selectedOrders.has(o.id)}
                    onChange={() => toggleOrder(o.id)}
                  />
                ))
              )}
              <Button onClick={printSelected} disabled={selectedOrders.size === 0}>
                Print Selected ({selectedOrders.size})
              </Button>
            </Stack>
          </Stack>
          <Stack gap="sm">
            {initialOrders
              .filter((o) => selectedOrders.has(o.id))
              .map((o) => (
                <PackingSlip key={o.id} order={o} brandName={brandName} />
              ))}
          </Stack>
        </>
      )}
    </Stack>
  );
}
