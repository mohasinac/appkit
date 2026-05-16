"use client";

import React from "react";
import type { LabelDesign } from "./types";

export interface StoreForCard {
  id: string;
  storeName: string;
  storeDescription?: string;
  storeLogoURL?: string;
  storeCategory?: string;
  primaryAddress?: string;
}

interface StoreCardProps {
  store: StoreForCard;
  publicBaseUrl: string;
  design: LabelDesign;
  qrDataUrl?: string;
  barcodeSvg?: string;
}

export function StoreCard({ store, publicBaseUrl, design, qrDataUrl, barcodeSvg }: StoreCardProps) {
  const isDark = design.colorScheme === "dark";

  const containerStyle: React.CSSProperties = {
    width: `${design.size.widthMm}mm`,
    height: `${design.size.heightMm}mm`,
    backgroundColor: isDark ? "#1a1a2e" : "#ffffff",
    color: isDark ? "#f0f0f0" : "#1a1a1a",
    border: "0.5mm solid #ccc",
    borderRadius: "1.5mm",
    padding: "3.5mm",
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
      {/* Top row: logo + store info */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "2mm", flex: 1 }}>
        <div style={{ flex: 1 }}>
          {design.show.logo && store.storeLogoURL && (
            <img
              src={store.storeLogoURL}
              alt={store.storeName}
              style={{ width: "8mm", height: "8mm", objectFit: "contain", marginBottom: "1mm" }}
            />
          )}
          <div style={{ fontSize: "9pt", fontWeight: "bold", lineHeight: 1.2 }}>
            {store.storeName}
          </div>
          {store.storeCategory && (
            <div style={{ fontSize: "5pt", color: isDark ? "#aaa" : "#666", marginTop: "0.5mm" }}>
              {store.storeCategory}
            </div>
          )}
          {store.storeDescription && (
            <div style={{ fontSize: "5.5pt", marginTop: "1mm", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {store.storeDescription}
            </div>
          )}
          {store.primaryAddress && (
            <div style={{ fontSize: "5pt", marginTop: "1mm", color: isDark ? "#aaa" : "#666" }}>
              {store.primaryAddress}
            </div>
          )}
        </div>

        {/* QR */}
        {qrDataUrl && (
          <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5mm" }}>
            <img src={qrDataUrl} alt="QR" style={{ width: "16mm", height: "16mm" }} />
            <span style={{ fontSize: "3.5pt", color: isDark ? "#aaa" : "#888" }}>Shop online</span>
          </div>
        )}
      </div>

      {/* Barcode */}
      {design.show.barcode && barcodeSvg && (
        <div
          style={{ marginTop: "1mm", display: "flex", justifyContent: "center" }}
          dangerouslySetInnerHTML={{ __html: barcodeSvg }}
        />
      )}

      {/* Footer */}
      <div style={{ marginTop: "1mm", fontSize: "4.5pt", color: isDark ? "#aaa" : "#888", textAlign: "center" }}>
        LetItRip — letitrip.in
      </div>
    </div>
  );
}
