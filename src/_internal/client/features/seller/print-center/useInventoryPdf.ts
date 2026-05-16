"use client";
import { useState, useCallback } from "react";
import type { ProductItem } from "../../../../../features/products/types";
import type { OrderForLabel } from "./OrderPackingLabel";
import type { StoreForCard } from "./StoreCard";
import type { LabelDesign } from "./types";

interface UseInventoryPdfOptions {
  products?: ProductItem[];
  orders?: OrderForLabel[];
  storeCards?: StoreForCard[];
  websiteCards?: StoreForCard[];
  design: LabelDesign;
  publicBaseUrl: string;
  brandName?: string;
}

const MM_TO_PT = 2.8346;

export function useInventoryPdf({
  products = [],
  orders = [],
  storeCards = [],
  websiteCards = [],
  design,
  publicBaseUrl,
  brandName = "",
}: UseInventoryPdfOptions) {
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadPdf = useCallback(async () => {
    setIsGenerating(true);
    try {
      const [{ jsPDF }, qrcode, jsbarcodeModule] = await Promise.all([
        import("jspdf"),
        import("qrcode"),
        import("jsbarcode"),
      ]);
      const JsBarcode = (jsbarcodeModule as { default: typeof import("jsbarcode") }).default;

      const wPt = design.size.widthMm * MM_TO_PT;
      const hPt = design.size.heightMm * MM_TO_PT;

      const pdf = new jsPDF({
        orientation: wPt > hPt ? "landscape" : "portrait",
        unit: "pt",
        format: [wPt, hPt],
      });

      let isFirst = true;

      const genQr = (url: string) =>
        (qrcode as { toDataURL: (url: string, opts: object) => Promise<string> }).toDataURL(url, { width: 80, margin: 1 });

      const genBarcode = (value: string): string => {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        (JsBarcode as (el: SVGSVGElement, val: string, opts: object) => void)(svg, value, { format: "CODE128", width: 1, height: 25, displayValue: false });
        const xml = new XMLSerializer().serializeToString(svg);
        return "data:image/svg+xml;base64," + btoa(xml);
      };

      const addPage = async (title: string, subtitle: string, qrUrl: string, barcodeValue: string, id: string) => {
        if (!isFirst) pdf.addPage([wPt, hPt]);
        isFirst = false;

        const qr = await genQr(qrUrl);
        const barSvg = genBarcode(barcodeValue);

        pdf.setFontSize(6);
        pdf.setTextColor(150, 150, 150);
        if (brandName) pdf.text(brandName, 5, 9);

        pdf.setFontSize(8);
        pdf.setTextColor(20, 20, 20);
        pdf.text(title.slice(0, 50), 5, 18);

        if (subtitle) {
          pdf.setFontSize(6);
          pdf.setTextColor(100, 100, 100);
          pdf.text(subtitle.slice(0, 60), 5, 25);
        }

        if (design.show.barcode) {
          pdf.addImage(barSvg, "SVG", 5, hPt - 20, wPt * 0.6, 12);
        }
        pdf.addImage(qr, "PNG", wPt - 30, hPt - 32, 26, 26);

        pdf.setFontSize(5);
        pdf.setTextColor(180, 180, 180);
        pdf.text(id, wPt / 2, hPt - 3, { align: "center" });
      };

      for (const p of products) {
        const priceStr = p.price != null ? `Rs.${(p.price / 100).toFixed(2)}` : "";
        await addPage(p.title, priceStr, `${publicBaseUrl}/products/${p.id}`, p.id, p.id);
      }
      for (const o of orders) {
        await addPage(`Order: ${o.id}`, `${o.items.length} item(s)`, `${publicBaseUrl}/store/orders/${o.id}/view`, o.id, o.id);
      }
      for (const s of storeCards) {
        await addPage(s.storeName, s.storeDescription?.slice(0, 60) ?? "", `${publicBaseUrl}/stores/${s.id}`, s.id, s.id);
      }
      for (const s of websiteCards) {
        await addPage(brandName ? `${brandName} - ${s.storeName}` : s.storeName, "Scan to shop", `${publicBaseUrl}/stores/${s.id}`, s.id, s.id);
      }

      pdf.save(`labels-${Date.now()}.pdf`);
    } finally {
      setIsGenerating(false);
    }
  }, [products, orders, storeCards, websiteCards, design, publicBaseUrl]);

  return { downloadPdf, isGenerating };
}