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
  barcodeDataUrl?: string;
  brandName?: string;
}

export function StoreCard({ store, publicBaseUrl, design, qrDataUrl, barcodeDataUrl, brandName }: StoreCardProps) {
  const { size, show, colorScheme } = design;
  const isDark = colorScheme === "dark";
  const bg = isDark ? "#1a1a1a" : "#ffffff";
  const fg = isDark ? "#f5f5f5" : "#111111";
  const muted = isDark ? "#999999" : "#666666";
  const border = isDark ? "#333333" : "#e5e5e5";

  const desc = store.storeDescription
    ? store.storeDescription.slice(0, 80) + (store.storeDescription.length > 80 ? "..." : "")
    : null;

  return (
    <div style={{
      width: `${size.widthMm}mm`,
      height: `${size.heightMm}mm`,
      background: bg,
      color: fg,
      border: `1px solid ${border}`,
      borderRadius: "3px",
      padding: "3mm",
      fontFamily: "sans-serif",
      fontSize: "7pt",
      display: "flex",
      flexDirection: "column",
      gap: "1.5mm",
      overflow: "hidden",
      boxSizing: "border-box",
      pageBreakInside: "avoid",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "2mm" }}>
        {show.logo && store.storeLogoURL && (
          <img src={store.storeLogoURL} alt={store.storeName} style={{ width: "8mm", height: "8mm", borderRadius: "2px", objectFit: "cover" }} />
        )}
        <>
          <div style={{ fontWeight: 700, fontSize: "9pt" }}>{store.storeName}</div>
          {store.storeCategory && <div style={{ fontSize: "6pt", color: muted }}>{store.storeCategory}</div>}
        </>
      </div>

      {desc && <div style={{ fontSize: "6pt", color: muted, flex: 1 }}>{desc}</div>}

      {store.primaryAddress && <div style={{ fontSize: "6pt", color: muted }}>{store.primaryAddress}</div>}

      {(show.barcode || qrDataUrl) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto" }}>
          {show.barcode && barcodeDataUrl && (
            <img src={barcodeDataUrl} alt="barcode" style={{ height: "7mm", maxWidth: "55%" }} />
          )}
          {qrDataUrl && <img src={qrDataUrl} alt="qr" style={{ width: "12mm", height: "12mm" }} />}
        </div>
      )}

      {brandName && (
        <div style={{ fontSize: "5pt", color: muted, textAlign: "center", borderTop: `1px solid ${border}`, paddingTop: "1mm" }}>
          {brandName} · {publicBaseUrl.replace(/^https?:\/\//, "")}
        </div>
      )}
    </div>
  );
}