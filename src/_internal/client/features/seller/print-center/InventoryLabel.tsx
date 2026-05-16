"use client";

import React from "react";
import type { ProductItem } from "../../../../../features/products";
import type { LabelDesign } from "./types";

interface InventoryLabelProps {
  product: ProductItem;
  publicBaseUrl: string;
  design: LabelDesign;
  qrDataUrl?: string;
  barcodeSvg?: string;
}

function getListingTypeBadge(product: ProductItem): { label: string; detail?: string } | null {
  const lt = (product as any).listingType as string | undefined;
  if (lt === "auction") {
    const endDate = (product as any).endDate as string | undefined;
    return { label: "AUCTION", detail: endDate ? new Date(endDate).toLocaleDateString("en-IN") : undefined };
  }
  if (lt === "pre-order") {
    const expected = (product as any).expectedDate as string | undefined;
    return { label: "PRE-ORDER", detail: expected ? new Date(expected).toLocaleDateString("en-IN") : undefined };
  }
  if (lt === "bundle") {
    const count = (product as any).bundleItemCount as number | undefined;
    return { label: "BUNDLE", detail: count ? `${count} items` : undefined };
  }
  if (lt === "prize-draw") return { label: "PRIZE DRAW" };
  if (lt === "classified") return { label: "CLASSIFIED" };
  if (lt === "digital-code") return { label: "DIGITAL CODE" };
  if (lt === "live") return { label: "LIVE" };
  return null;
}

function formatPrice(paise: number | undefined): string {
  if (!paise) return "";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export function InventoryLabel({ product, publicBaseUrl, design, qrDataUrl, barcodeSvg }: InventoryLabelProps) {
  const badge = design.show.listingTypeBadge ? getListingTypeBadge(product) : null;
  const url = `${publicBaseUrl}/products/${product.slug ?? product.id}`;
  const loc = (product as any).physicalLocation as { zone: string; shelf: string; bin: string } | undefined;
  const isDark = design.colorScheme === "dark";

  const containerStyle: React.CSSProperties = {
    width: `${design.size.widthMm}mm`,
    height: `${design.size.heightMm}mm`,
    backgroundColor: isDark ? "#1a1a2e" : "#ffffff",
    color: isDark ? "#f0f0f0" : "#1a1a1a",
    border: "0.5mm solid #ccc",
    borderRadius: "1mm",
    padding: "2mm",
    display: "flex",
    flexDirection: "column",
    fontSize: "6pt",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
    overflow: "hidden",
    position: "relative",
    pageBreakInside: "avoid",
  };

  return (
    <div style={containerStyle}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: "1mm", marginBottom: "1mm" }}>
        {design.show.logo && design.template !== "minimal" && (
          <span style={{ fontSize: "5pt", fontWeight: "bold", color: isDark ? "#e8b4b8" : "var(--appkit-color-primary, #6b21a8)" }}>
            LetItRip
          </span>
        )}
        {badge && (
          <span style={{
            fontSize: "4pt",
            padding: "0.3mm 1mm",
            borderRadius: "0.5mm",
            backgroundColor: "#dc2626",
            color: "#fff",
            fontWeight: "bold",
            marginLeft: "auto",
          }}>
            {badge.label}{badge.detail ? ` · ${badge.detail}` : ""}
          </span>
        )}
      </div>

      {/* Main content */}
      <div style={{ display: "flex", flex: 1, gap: "1.5mm", overflow: "hidden" }}>
        {/* Left: text info */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontSize: "7pt", fontWeight: "bold", lineHeight: 1.2, marginBottom: "0.5mm", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {product.name}
          </div>
          {design.show.price && product.price && (
            <div style={{ fontSize: "8pt", fontWeight: "bold", color: isDark ? "#86efac" : "#15803d" }}>
              {formatPrice(product.price)}
            </div>
          )}
          {design.template !== "minimal" && (product as any).condition && (
            <div style={{ fontSize: "5pt", color: isDark ? "#aaa" : "#666", marginTop: "0.5mm" }}>
              {(product as any).condition}
            </div>
          )}
          {design.show.stock && (product as any).stockCount !== undefined && (
            <div style={{ fontSize: "5pt", marginTop: "0.3mm" }}>
              Stock: {(product as any).stockCount}
            </div>
          )}
          {design.show.location && loc && (
            <div style={{ fontSize: "5pt", marginTop: "0.5mm", padding: "0.3mm 0.7mm", backgroundColor: isDark ? "#333" : "#f3f4f6", borderRadius: "0.3mm" }}>
              {loc.zone} / {loc.shelf} / {loc.bin}
            </div>
          )}
          <div style={{ fontSize: "4pt", marginTop: "0.5mm", color: isDark ? "#aaa" : "#888", wordBreak: "break-all" }}>
            {product.id}
          </div>
        </div>

        {/* Right: QR code */}
        {qrDataUrl && (
          <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3mm" }}>
            <img src={qrDataUrl} alt="QR" style={{ width: "14mm", height: "14mm" }} />
            <span style={{ fontSize: "3.5pt", color: isDark ? "#aaa" : "#888" }}>Scan</span>
          </div>
        )}
      </div>

      {/* Barcode */}
      {design.show.barcode && barcodeSvg && (
        <div
          style={{ marginTop: "0.5mm", display: "flex", justifyContent: "center" }}
          dangerouslySetInnerHTML={{ __html: barcodeSvg }}
        />
      )}
    </div>
  );
}
