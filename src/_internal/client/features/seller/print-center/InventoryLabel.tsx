"use client";
import React from "react";
import type { ProductItem } from "../../../../../features/products/types";
import type { LabelDesign } from "./types";

interface InventoryLabelProps {
  product: ProductItem;
  publicBaseUrl: string;
  design: LabelDesign;
  qrDataUrl?: string;
  barcodeDataUrl?: string;
  brandName?: string;
}

function getListingBadge(product: ProductItem): { label: string; sub?: string } | null {
  const lt = product.listingType;
  if (lt === "auction") {
    const sub = product.auctionEndDate
      ? `Ends ${new Date(product.auctionEndDate).toLocaleDateString("en-IN")}`
      : undefined;
    return { label: "AUCTION", sub };
  }
  if (lt === "pre-order") {
    const sub = product.preOrderDeliveryDate
      ? `Expected ${new Date(product.preOrderDeliveryDate).toLocaleDateString("en-IN")}`
      : undefined;
    return { label: "PRE-ORDER", sub };
  }
  if (lt === "prize-draw") return { label: "PRIZE DRAW" };
  return null;
}

export function InventoryLabel({ product, design, qrDataUrl, barcodeDataUrl, brandName = "" }: InventoryLabelProps) {
  const { size, show, colorScheme } = design;
  const isDark = colorScheme === "dark";
  const bg = isDark ? "#1a1a1a" : "#ffffff";
  const fg = isDark ? "#f5f5f5" : "#111111";
  const muted = isDark ? "#999999" : "#666666";
  const border = isDark ? "#333333" : "#e5e5e5";

  const badge = show.listingTypeBadge ? getListingBadge(product) : null;
  const loc = product.physicalLocation;
  const locStr = loc ? `${loc.zone} / ${loc.shelf} / ${loc.bin}` : null;
  const priceStr = product.price != null ? `₹${(product.price / 100).toFixed(2)}` : null;

  return (
    <div style={{
      width: `${size.widthMm}mm`,
      height: `${size.heightMm}mm`,
      background: bg,
      color: fg,
      border: `1px solid ${border}`,
      borderRadius: "2px",
      padding: "2mm",
      fontFamily: "monospace, sans-serif",
      fontSize: "7pt",
      display: "flex",
      flexDirection: "column",
      gap: "1mm",
      overflow: "hidden",
      boxSizing: "border-box",
      pageBreakInside: "avoid",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        {show.logo && brandName && (
          <span style={{ fontWeight: 700, fontSize: "6pt", color: muted, letterSpacing: "0.05em" }}>{brandName}</span>
        )}
        {badge && (
          <span style={{ background: "#111", color: "#fff", fontSize: "5pt", fontWeight: 700, padding: "0.5mm 1.5mm", borderRadius: "1px", letterSpacing: "0.05em" }}>
            {badge.label}
          </span>
        )}
      </div>

      <div style={{ fontWeight: 700, fontSize: "8pt", lineHeight: 1.2, flex: 1 }}>{product.title}</div>

      {badge?.sub && <div style={{ fontSize: "6pt", color: muted }}>{badge.sub}</div>}

      {(show.price || show.stock) && (
        <div style={{ display: "flex", gap: "3mm", alignItems: "center" }}>
          {show.price && priceStr && <span style={{ fontWeight: 700, fontSize: "8pt" }}>{priceStr}</span>}
          {show.stock && product.stockCount != null && (
            <span style={{ fontSize: "6pt", color: muted }}>Qty: {product.stockCount}</span>
          )}
          {product.condition && <span style={{ fontSize: "6pt", color: muted }}>{product.condition}</span>}
        </div>
      )}

      {show.location && locStr && <div style={{ fontSize: "6pt", color: muted }}>{locStr}</div>}

      {(show.barcode || qrDataUrl) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto" }}>
          {show.barcode && barcodeDataUrl && (
            <img src={barcodeDataUrl} alt="barcode" style={{ height: "8mm", maxWidth: "60%" }} />
          )}
          {qrDataUrl && <img src={qrDataUrl} alt="qr" style={{ width: "10mm", height: "10mm" }} />}
        </div>
      )}

      <div style={{ fontSize: "5pt", color: muted, textAlign: "center" }}>{product.id}</div>
    </div>
  );
}