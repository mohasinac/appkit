"use client";

import React, { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Heading, Text } from "../../../ui/components/Typography";
import { Stack, Row } from "../../../ui/components/Layout";
import { Button } from "../../../ui/components/Button";
import { FieldCheckbox } from "../../../ui/forms/FieldCheckbox";

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
  physicalLocation?: string;
  barcodeId?: string;
}

interface PrintCenterOrder {
  id: string;
  createdAt: string;
  status: string;
  buyerDisplayName?: string;
  buyerCity?: string;
  items: { productName: string; quantity: number; price: number; barcodeId?: string }[];
  physicalLocation?: string;
}

interface PrintCenterViewProps {
  store?: PrintCenterStore | null;
  publicBaseUrl?: string;
  isAdmin?: boolean;
  brandName?: string;
  initialProducts?: PrintCenterProduct[];
  initialOrders?: PrintCenterOrder[];
}

function ProductLabel({ product }: { product: PrintCenterProduct }) {
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (svgRef.current && product.barcodeId) {
      try {
        JsBarcode(svgRef.current, product.barcodeId, {
          format: "CODE128",
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 12,
          margin: 8,
        });
      } catch {
        // Invalid barcode value — render nothing
      }
    }
  }, [product.barcodeId]);

  return (
    <Stack surface="card" padding="sm" rounded="sm" gap="xs" className="break-inside-avoid text-center w-[200px]">
      {product.barcodeId ? (
        <svg ref={svgRef} />
      ) : (
        <Text size="xs" color="muted">No barcode</Text>
      )}
      <Text size="xs" weight="medium" truncate={1}>{product.name}</Text>
      <Text size="xs" color="muted">₹{(product.price / 100).toLocaleString("en-IN")}</Text>
      {product.physicalLocation && (
        <Text size="xs" color="muted">{product.physicalLocation}</Text>
      )}
    </Stack>
  );
}

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
      {order.physicalLocation && (
        <Text size="xs" color="muted">Staging: {order.physicalLocation}</Text>
      )}
      {/* audit-variant-ok: directional top-border + top-padding for print separator — no Stack variant covers mt-3/border-t/pt-2 combo */}
      <Stack className="mt-3 border-t pt-2">
        {order.items.map((item, i) => (
          // audit-variant-ok: py-1 is vertical-only padding; border-b last:border-b-0 uses pseudo-selector — no Row variant covers these
          <Row key={i} justify="between" className="py-1 border-b last:border-b-0">
            <Stack gap="xs">
              <Text size="xs" weight="medium">{item.productName}</Text>
              {item.barcodeId && <Text size="xs" color="muted">{item.barcodeId}</Text>}
            </Stack>
            <Stack className="text-right">
              <Text size="xs">×{item.quantity}</Text>
              <Text size="xs" color="muted">₹{(item.price / 100).toLocaleString("en-IN")}</Text>
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

  const toggleProduct = (id: string) =>
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleOrder = (id: string) =>
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const printSelected = () => window.print();

  return (
    <Stack gap="md" padding="md">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

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
          <Stack className="no-print">
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
          <Row wrap gap="sm" className="mt-4">
            {initialProducts
              .filter((p) => selectedProducts.has(p.id))
              .map((p) => (
                <ProductLabel key={p.id} product={p} />
              ))}
          </Row>
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
