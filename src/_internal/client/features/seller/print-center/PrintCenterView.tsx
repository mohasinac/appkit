"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../../../ui/components/Tabs";
import { Button } from "../../../../../ui/components/Button";
import { Input } from "../../../../../ui/components/Input";
import { Text } from "../../../../../ui/components/Typography";
import { Row } from "../../../../../ui/components/Layout";
import type { ProductItem } from "../../../../../features/products/types";
import {
  DEFAULT_PRODUCT_LABEL_DESIGN,
  DEFAULT_ORDER_LABEL_DESIGN,
  DEFAULT_CARD_DESIGN,
  LABEL_DESIGN_STORAGE_KEY,
  type LabelDesign,
} from "./types";
import { LabelDesignPicker } from "./LabelDesignPicker";
import { PrintGrid } from "./PrintGrid";
import { InventoryLabel } from "./InventoryLabel";
import { OrderPackingLabel, type OrderForLabel } from "./OrderPackingLabel";
import { StoreCard, type StoreForCard } from "./StoreCard";
import { WebsiteCard } from "./WebsiteCard";
import { useInventoryPdf } from "./useInventoryPdf";

export interface PrintCenterViewProps {
  store: StoreForCard | null;
  publicBaseUrl: string;
  isAdmin?: boolean;
  initialProducts?: ProductItem[];
  initialOrders?: OrderForLabel[];
  brandName?: string;
}

interface LabelData {
  qrDataUrl?: string;
  barcodeDataUrl?: string;
}

function loadSavedDesign(def: LabelDesign): LabelDesign {
  try {
    const raw = localStorage.getItem(LABEL_DESIGN_STORAGE_KEY);
    if (raw) return { ...def, ...JSON.parse(raw) };
  } catch { /* noop */ }
  return def;
}

async function generateLabelData(id: string, qrUrl: string): Promise<LabelData> {
  try {
    const [qrcode, jsbarcodeModule] = await Promise.all([
      import("qrcode"),
      import("jsbarcode"),
    ]);
    const JsBarcode = (jsbarcodeModule as { default: typeof import("jsbarcode") }).default;

    const qrDataUrl = await (qrcode as { toDataURL: (url: string, opts: object) => Promise<string> }).toDataURL(qrUrl, { width: 80, margin: 1 });

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    (JsBarcode as (el: SVGSVGElement, val: string, opts: object) => void)(svg, id, { format: "CODE128", width: 1, height: 25, displayValue: false });
    const barcodeDataUrl = "data:image/svg+xml;base64," + btoa(new XMLSerializer().serializeToString(svg));

    return { qrDataUrl, barcodeDataUrl };
  } catch {
    return {};
  }
}

type PrintMode = "products" | "orders" | "store" | "website";

export function PrintCenterView({
  store,
  publicBaseUrl,
  isAdmin = false,
  initialProducts = [],
  initialOrders = [],
  brandName = "",
}: PrintCenterViewProps) {
  const [tab, setTab] = useState("products");
  const [productDesign, setProductDesign] = useState<LabelDesign>(() => loadSavedDesign(DEFAULT_PRODUCT_LABEL_DESIGN));
  const [orderDesign, setOrderDesign] = useState<LabelDesign>(DEFAULT_ORDER_LABEL_DESIGN);
  const [cardDesign, setCardDesign] = useState<LabelDesign>(DEFAULT_CARD_DESIGN);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [storeCardCopies, setStoreCardCopies] = useState(1);
  const [websiteCardCopies, setWebsiteCardCopies] = useState(1);
  const [labelCache, setLabelCache] = useState<Record<string, LabelData>>({});
  const [showGrid, setShowGrid] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode>("products");

  const selectedProducts = initialProducts.filter(p => selectedProductIds.has(p.id));
  const selectedOrders = initialOrders.filter(o => selectedOrderIds.has(o.id));

  useEffect(() => {
    const items = [
      ...initialProducts.map(p => ({ id: p.id, url: `${publicBaseUrl}/products/${p.id}` })),
      ...initialOrders.map(o => ({ id: o.id, url: `${publicBaseUrl}/store/orders/${o.id}/view` })),
      ...(store ? [{ id: store.id, url: `${publicBaseUrl}/stores/${store.id}` }] : []),
    ];
    for (const item of items) {
      if (labelCache[item.id]) continue;
      generateLabelData(item.id, item.url).then(data =>
        setLabelCache(prev => ({ ...prev, [item.id]: data }))
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProducts.length, initialOrders.length, store?.id, publicBaseUrl]);

  const { downloadPdf: dlProducts, isGenerating: genProducts } = useInventoryPdf({ products: selectedProducts, design: productDesign, publicBaseUrl, brandName });
  const { downloadPdf: dlOrders, isGenerating: genOrders } = useInventoryPdf({ orders: selectedOrders, design: orderDesign, publicBaseUrl, brandName });
  const { downloadPdf: dlStore, isGenerating: genStore } = useInventoryPdf({ storeCards: store ? Array<StoreForCard>(storeCardCopies).fill(store) : [], design: cardDesign, publicBaseUrl, brandName });
  const { downloadPdf: dlWebsite, isGenerating: genWebsite } = useInventoryPdf({ websiteCards: store ? Array<StoreForCard>(websiteCardCopies).fill(store) : [], design: cardDesign, publicBaseUrl, brandName });

  const toggleProduct = useCallback((id: string) => {
    setSelectedProductIds(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  }, []);

  const toggleOrder = useCallback((id: string) => {
    setSelectedOrderIds(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  }, []);

  if (showGrid && printMode === "products") {
    return <PrintGrid items={selectedProducts.map(p => <InventoryLabel key={p.id} product={p} publicBaseUrl={publicBaseUrl} design={productDesign} qrDataUrl={labelCache[p.id]?.qrDataUrl} barcodeDataUrl={labelCache[p.id]?.barcodeDataUrl} />)} columns={4} onBack={() => setShowGrid(false)} onDownloadPdf={dlProducts} isGeneratingPdf={genProducts} />;
  }
  if (showGrid && printMode === "orders") {
    return <PrintGrid items={selectedOrders.map(o => <OrderPackingLabel key={o.id} order={o} storeBaseUrl={publicBaseUrl} design={orderDesign} qrDataUrl={labelCache[o.id]?.qrDataUrl} barcodeDataUrl={labelCache[o.id]?.barcodeDataUrl} />)} columns={4} onBack={() => setShowGrid(false)} onDownloadPdf={dlOrders} isGeneratingPdf={genOrders} />;
  }
  if (showGrid && printMode === "store" && store) {
    return <PrintGrid items={Array.from({ length: storeCardCopies }, (_, i) => <StoreCard key={i} store={store} publicBaseUrl={publicBaseUrl} design={cardDesign} qrDataUrl={labelCache[store.id]?.qrDataUrl} barcodeDataUrl={labelCache[store.id]?.barcodeDataUrl} />)} columns={4} onBack={() => setShowGrid(false)} onDownloadPdf={dlStore} isGeneratingPdf={genStore} />;
  }
  if (showGrid && printMode === "website" && store) {
    return <PrintGrid items={Array.from({ length: websiteCardCopies }, (_, i) => <WebsiteCard key={i} store={store} publicBaseUrl={publicBaseUrl} design={cardDesign} qrDataUrl={labelCache[store.id]?.qrDataUrl} brandName={brandName} />)} columns={4} onBack={() => setShowGrid(false)} onDownloadPdf={dlWebsite} isGeneratingPdf={genWebsite} />;
  }

  const PANEL_STYLE: React.CSSProperties = { border: "1px solid #e5e7eb", borderRadius: "6px", overflow: "hidden" };
  const PANEL_HEAD: React.CSSProperties = { padding: "12px", borderBottom: "1px solid #e5e7eb", fontWeight: 600, fontSize: "13px" };
  const GRID_LAYOUT: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 280px", gap: "16px", marginTop: "16px" };

  return (
    <div style={{ maxWidth: "960px" }}>
      {isAdmin && (
        <div style={{ marginBottom: "16px", padding: "12px", background: "var(--appkit-color-primary, #6d28d9)", color: "#fff", borderRadius: "6px", fontSize: "13px" }}>
          Admin mode — generating materials for: {store?.storeName ?? "all stores"}
        </div>
      )}

      <Tabs value={tab} onChange={setTab}>
        <TabsList>
          <TabsTrigger value="products">Product Labels</TabsTrigger>
          <TabsTrigger value="orders">Packing Slips</TabsTrigger>
          <TabsTrigger value="store">Store Cards</TabsTrigger>
          <TabsTrigger value="website">Website Cards</TabsTrigger>
        </TabsList>

        {/* ── Product Labels ── */}
        <TabsContent value="products">
          <div style={GRID_LAYOUT}>
            <div style={{ minWidth: 0 }}>
              <Text variant="muted" style={{ marginBottom: "8px", display: "block" }}>
                Select products ({selectedProductIds.size} selected)
              </Text>
              <div style={PANEL_STYLE}>
                {initialProducts.length === 0 && (
                  <div style={{ padding: "24px", textAlign: "center", color: "#9ca3af" }}>No products loaded</div>
                )}
                {initialProducts.map(p => (
                  <label key={p.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", background: selectedProductIds.has(p.id) ? "#f5f3ff" : "#fff" }}>
                    <input type="checkbox" checked={selectedProductIds.has(p.id)} onChange={() => toggleProduct(p.id)} />
                    <span style={{ flex: 1, fontSize: "13px", fontWeight: 500 }}>{p.title}</span>
                    <span style={{ fontSize: "11px", color: "#9ca3af" }}>{p.listingType ?? "standard"}</span>
                    {p.physicalLocation && (
                      <span style={{ fontSize: "11px", color: "#6b7280", background: "#f3f4f6", padding: "2px 6px", borderRadius: "4px" }}>
                        {p.physicalLocation.zone}/{p.physicalLocation.shelf}/{p.physicalLocation.bin}
                      </span>
                    )}
                  </label>
                ))}
              </div>
              {initialProducts.length > 0 && (
                <Row gap="sm" style={{ marginTop: "6px" }}>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedProductIds(new Set(initialProducts.map(p => p.id)))}>All</Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedProductIds(new Set())}>Clear</Button>
                </Row>
              )}
              <Row gap="sm" style={{ marginTop: "12px" }}>
                <Button variant="primary" disabled={selectedProductIds.size === 0} onClick={() => { setPrintMode("products"); setShowGrid(true); }}>
                  Print{selectedProductIds.size > 0 ? ` (${selectedProductIds.size})` : ""}
                </Button>
                <Button variant="outline" disabled={selectedProductIds.size === 0 || genProducts} onClick={dlProducts}>
                  {genProducts ? "Generating..." : "Download PDF"}
                </Button>
              </Row>
            </div>
            <div style={PANEL_STYLE}>
              <div style={PANEL_HEAD}>Label Design</div>
              <LabelDesignPicker value={productDesign} onChange={setProductDesign} />
            </div>
          </div>
        </TabsContent>

        {/* ── Packing Slips ── */}
        <TabsContent value="orders">
          <div style={GRID_LAYOUT}>
            <div style={{ minWidth: 0 }}>
              <Text variant="muted" style={{ marginBottom: "8px", display: "block" }}>
                Select orders ({selectedOrderIds.size} selected)
              </Text>
              <div style={PANEL_STYLE}>
                {initialOrders.length === 0 && (
                  <div style={{ padding: "24px", textAlign: "center", color: "#9ca3af" }}>No orders loaded</div>
                )}
                {initialOrders.map(o => (
                  <label key={o.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", background: selectedOrderIds.has(o.id) ? "#f5f3ff" : "#fff" }}>
                    <input type="checkbox" checked={selectedOrderIds.has(o.id)} onChange={() => toggleOrder(o.id)} />
                    <span style={{ flex: 1, fontSize: "13px", fontWeight: 500 }}>{o.id}</span>
                    <span style={{ fontSize: "11px", color: "#9ca3af" }}>{o.items.length} item{o.items.length !== 1 ? "s" : ""}</span>
                  </label>
                ))}
              </div>
              {initialOrders.length > 0 && (
                <Row gap="sm" style={{ marginTop: "6px" }}>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedOrderIds(new Set(initialOrders.map(o => o.id)))}>All</Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedOrderIds(new Set())}>Clear</Button>
                </Row>
              )}
              <Row gap="sm" style={{ marginTop: "12px" }}>
                <Button variant="primary" disabled={selectedOrderIds.size === 0} onClick={() => { setPrintMode("orders"); setShowGrid(true); }}>
                  Print{selectedOrderIds.size > 0 ? ` (${selectedOrderIds.size})` : ""}
                </Button>
                <Button variant="outline" disabled={selectedOrderIds.size === 0 || genOrders} onClick={dlOrders}>
                  {genOrders ? "Generating..." : "Download PDF"}
                </Button>
              </Row>
            </div>
            <div style={PANEL_STYLE}>
              <div style={PANEL_HEAD}>Label Design</div>
              <LabelDesignPicker value={orderDesign} onChange={setOrderDesign} />
            </div>
          </div>
        </TabsContent>

        {/* ── Store Cards ── */}
        <TabsContent value="store">
          <div style={GRID_LAYOUT}>
            <div style={{ minWidth: 0 }}>
              {!store ? (
                <Text variant="muted">No store data available.</Text>
              ) : (
                <>
                  <Text variant="muted" style={{ marginBottom: "12px", display: "block" }}>
                    Business cards for <strong>{store.storeName}</strong>
                  </Text>
                  <Row gap="sm" style={{ alignItems: "center", marginBottom: "16px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 500 }}>Copies:</span>
                    <Input
                      type="number"
                      value={storeCardCopies}
                      onChange={e => setStoreCardCopies(Math.max(1, Math.min(100, Number(e.target.value))))}
                      style={{ width: "80px" }}
                    />
                  </Row>
                  <div style={{ marginBottom: "16px" }}>
                    <StoreCard store={store} publicBaseUrl={publicBaseUrl} design={cardDesign} qrDataUrl={labelCache[store.id]?.qrDataUrl} barcodeDataUrl={labelCache[store.id]?.barcodeDataUrl} />
                  </div>
                  <Row gap="sm">
                    <Button variant="primary" onClick={() => { setPrintMode("store"); setShowGrid(true); }}>
                      Print {storeCardCopies} card{storeCardCopies !== 1 ? "s" : ""}
                    </Button>
                    <Button variant="outline" disabled={genStore} onClick={dlStore}>
                      {genStore ? "Generating..." : "Download PDF"}
                    </Button>
                  </Row>
                </>
              )}
            </div>
            <div style={PANEL_STYLE}>
              <div style={PANEL_HEAD}>Card Design</div>
              <LabelDesignPicker value={cardDesign} onChange={setCardDesign} />
            </div>
          </div>
        </TabsContent>

        {/* ── Website Cards ── */}
        <TabsContent value="website">
          <div style={GRID_LAYOUT}>
            <div style={{ minWidth: 0 }}>
              {!store ? (
                <Text variant="muted">No store data available.</Text>
              ) : (
                <>
                  <Text variant="muted" style={{ marginBottom: "12px", display: "block" }}>
                    Promotional cards to hand out at physical stalls and events.
                  </Text>
                  <Row gap="sm" style={{ alignItems: "center", marginBottom: "16px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 500 }}>Copies:</span>
                    <Input
                      type="number"
                      value={websiteCardCopies}
                      onChange={e => setWebsiteCardCopies(Math.max(1, Math.min(100, Number(e.target.value))))}
                      style={{ width: "80px" }}
                    />
                  </Row>
                  <div style={{ marginBottom: "16px" }}>
                    <WebsiteCard store={store} publicBaseUrl={publicBaseUrl} design={cardDesign} qrDataUrl={labelCache[store.id]?.qrDataUrl} brandName={brandName} />
                  </div>
                  <Row gap="sm">
                    <Button variant="primary" onClick={() => { setPrintMode("website"); setShowGrid(true); }}>
                      Print {websiteCardCopies} card{websiteCardCopies !== 1 ? "s" : ""}
                    </Button>
                    <Button variant="outline" disabled={genWebsite} onClick={dlWebsite}>
                      {genWebsite ? "Generating..." : "Download PDF"}
                    </Button>
                  </Row>
                </>
              )}
            </div>
            <div style={PANEL_STYLE}>
              <div style={PANEL_HEAD}>Card Design</div>
              <LabelDesignPicker value={cardDesign} onChange={setCardDesign} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}