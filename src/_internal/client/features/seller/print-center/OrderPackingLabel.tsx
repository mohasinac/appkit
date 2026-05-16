"use client";

import React from "react";
import type { LabelDesign } from "./types";

export interface OrderForLabel {
  id: string;
  createdAt: string;
  status: string;
  buyerDisplayName?: string;
  buyerCity?: string;
  items: Array<{ productName: string; quantity: number; price: number }>;
  physicalLocation?: { zone: string; shelf: string; bin: string };
}

interface OrderPackingLabelProps {
  order: OrderForLabel;
  storeBaseUrl: string;
  design: LabelDesign;
  qrDataUrl?: string;
  barcodeSvg?: string;
}

export function OrderPackingLabel({ order, storeBaseUrl, design, qrDataUrl, barcodeSvg }: OrderPackingLabelProps) {
  const isDark = design.colorScheme === "dark";
  const visibleItems = order.items.slice(0, 4);
  const extraCount = order.items.length - visibleItems.length;

  const containerStyle: React.CSSProperties = {
    width: `${design.size.widthMm}mm`,
    height: `${design.size.heightMm}mm`,
    backgroundColor: isDark ? "#1a1a2e" : "#ffffff",
    color: isDark ? "#f0f0f0" : "#1a1a1a",
    border: "0.5mm solid #ccc",
    borderRadius: "1mm",
    padding: "3mm",
    display: "flex",
    flexDirection: "column",
    fontSize: "6.5pt",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
    overflow: "hidden",
    pageBreakInside: "avoid",
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5mm" }}>
        <div>
          <div style={{ fontSize: "7.5pt", fontWeight: "bold", letterSpacing: "0.5pt" }}>PACKING SLIP</div>
          <div style={{ fontSize: "5.5pt", color: isDark ? "#aaa" : "#666", marginTop: "0.3mm" }}>
            {new Date(order.createdAt).toLocaleDateString("en-IN")}
          </div>
        </div>
        {qrDataUrl && (
          <img src={qrDataUrl} alt="QR" style={{ width: "14mm", height: "14mm" }} />
        )}
      </div>

      {/* Order ID */}
      <div style={{ fontSize: "6.5pt", fontWeight: "bold", marginBottom: "1mm", wordBreak: "break-all" }}>
        #{order.id}
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {visibleItems.map((item, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "5.5pt", marginBottom: "0.3mm" }}>
            <span style={{ overflow: "hidden", flex: 1, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
              {item.quantity}× {item.productName}
            </span>
            <span style={{ flexShrink: 0, marginLeft: "1mm" }}>₹{(item.price / 100).toFixed(0)}</span>
          </div>
        ))}
        {extraCount > 0 && (
          <div style={{ fontSize: "5pt", color: isDark ? "#aaa" : "#888" }}>+{extraCount} more item{extraCount > 1 ? "s" : ""}</div>
        )}
      </div>

      {/* Buyer + location */}
      <div style={{ marginTop: "1mm", borderTop: `0.3mm solid ${isDark ? "#444" : "#e5e7eb"}`, paddingTop: "1mm" }}>
        {order.buyerDisplayName && (
          <div style={{ fontSize: "5.5pt" }}>
            {order.buyerDisplayName.split(" ")[0]}{order.buyerCity ? ` · ${order.buyerCity}` : ""}
          </div>
        )}
        {design.show.location && order.physicalLocation && (
          <div style={{ fontSize: "5.5pt", marginTop: "0.3mm", padding: "0.3mm 0.7mm", backgroundColor: isDark ? "#333" : "#f3f4f6", borderRadius: "0.3mm" }}>
            Stage: {order.physicalLocation.zone} / {order.physicalLocation.shelf} / {order.physicalLocation.bin}
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

      {design.show.logo && (
        <div style={{ fontSize: "4.5pt", color: isDark ? "#aaa" : "#888", textAlign: "center", marginTop: "0.5mm" }}>
          LetItRip
        </div>
      )}
    </div>
  );
}
