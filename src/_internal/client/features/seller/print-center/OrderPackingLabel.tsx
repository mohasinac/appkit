"use client";
import React from "react";
import type { LabelDesign } from "./types";

export interface OrderForLabel {
  id: string;
  createdAt?: string;
  status?: string;
  buyerDisplayName?: string;
  buyerCity?: string;
  items: { productName: string; quantity: number; price: number }[];
  physicalLocation?: { zone: string; shelf: string; bin: string };
}

interface OrderPackingLabelProps {
  order: OrderForLabel;
  storeBaseUrl: string;
  design: LabelDesign;
  qrDataUrl?: string;
  barcodeDataUrl?: string;
  brandName?: string;
}

export function OrderPackingLabel({ order, design, qrDataUrl, barcodeDataUrl, brandName = "" }: OrderPackingLabelProps) {
  const { size, show, colorScheme } = design;
  const isDark = colorScheme === "dark";
  const bg = isDark ? "#1a1a1a" : "#ffffff";
  const fg = isDark ? "#f5f5f5" : "#111111";
  const muted = isDark ? "#999999" : "#666666";
  const border = isDark ? "#333333" : "#e5e5e5";

  const MAX_ITEMS = 4;
  const shownItems = order.items.slice(0, MAX_ITEMS);
  const extraCount = order.items.length - MAX_ITEMS;
  const loc = order.physicalLocation;
  const locStr = loc ? `${loc.zone} / ${loc.shelf} / ${loc.bin}` : null;
  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN") : "";

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: "9pt", letterSpacing: "0.1em" }}>PACKING SLIP</span>
        {show.logo && brandName && <span style={{ fontSize: "6pt", color: muted }}>{brandName}</span>}
      </div>

      <div style={{ fontWeight: 700, fontSize: "8pt" }}>{order.id}</div>
      <div style={{ fontSize: "6pt", color: muted }}>{dateStr}{order.status ? ` · ${order.status}` : ""}</div>

      <div style={{ borderTop: `1px solid ${border}`, paddingTop: "1mm", flex: 1 }}>
        {shownItems.map((item, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "6pt", marginBottom: "0.5mm" }}>
            <span style={{ flex: 1, overflow: "hidden" }}>x{item.quantity} {item.productName}</span>
            <span>Rs.{(item.price / 100).toFixed(0)}</span>
          </div>
        ))}
        {extraCount > 0 && <div style={{ fontSize: "6pt", color: muted }}>+{extraCount} more</div>}
      </div>

      {(order.buyerDisplayName || order.buyerCity) && (
        <div style={{ fontSize: "6pt" }}>
          {order.buyerDisplayName?.split(" ")[0]}{order.buyerCity ? ` · ${order.buyerCity}` : ""}
        </div>
      )}

      {show.location && locStr && <div style={{ fontSize: "6pt", color: muted }}>Stage: {locStr}</div>}

      {(show.barcode || qrDataUrl) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto" }}>
          {show.barcode && barcodeDataUrl && (
            <img src={barcodeDataUrl} alt="barcode" style={{ height: "8mm", maxWidth: "65%" }} />
          )}
          {qrDataUrl && <img src={qrDataUrl} alt="qr" style={{ width: "10mm", height: "10mm" }} />}
        </div>
      )}
    </div>
  );
}