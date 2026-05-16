"use client";
import React from "react";
import type { StoreForCard } from "./StoreCard";
import type { LabelDesign } from "./types";

interface WebsiteCardProps {
  store: StoreForCard;
  publicBaseUrl: string;
  design: LabelDesign;
  qrDataUrl?: string;
  brandName?: string;
}

export function WebsiteCard({ store, publicBaseUrl, design, qrDataUrl, brandName = "" }: WebsiteCardProps) {
  const { size, colorScheme } = design;
  const isDark = colorScheme === "dark";
  const bg = isDark ? "#2d1b69" : "#6d28d9";

  return (
    <div style={{
      width: `${size.widthMm}mm`,
      height: `${size.heightMm}mm`,
      background: bg,
      color: "#ffffff",
      borderRadius: "3px",
      padding: "3mm",
      fontFamily: "sans-serif",
      fontSize: "7pt",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "space-between",
      overflow: "hidden",
      boxSizing: "border-box",
      pageBreakInside: "avoid",
      textAlign: "center",
    }}>
      {brandName && <div style={{ fontWeight: 800, fontSize: "11pt", letterSpacing: "0.05em" }}>{brandName}</div>}

      {qrDataUrl && (
        <img src={qrDataUrl} alt="qr" style={{ width: "16mm", height: "16mm", background: "#fff", padding: "1mm", borderRadius: "2px" }} />
      )}

      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "8pt", fontWeight: 600 }}>Scan to shop</div>
        <div style={{ fontSize: "6pt", color: "rgba(255,255,255,0.75)" }}>{store.storeName}{brandName ? ` on ${brandName}` : ""}</div>
        <div style={{ fontSize: "5pt", color: "rgba(255,255,255,0.55)", marginTop: "0.5mm" }}>{publicBaseUrl.replace(/^https?:\/\//, "")}</div>
      </div>
    </div>
  );
}