"use client";
import React, { useEffect } from "react";
import { Button } from "../../../../../ui/components/Button";

interface PrintGridProps {
  items: React.ReactNode[];
  columns?: 2 | 4;
  pageSize?: "A4" | "Letter" | "Label";
  autoprint?: boolean;
  onBack?: () => void;
  onDownloadPdf?: () => void;
  isGeneratingPdf?: boolean;
}

export function PrintGrid({ items, columns = 4, autoprint = false, onBack, onDownloadPdf, isGeneratingPdf = false }: PrintGridProps) {
  useEffect(() => {
    if (!autoprint || items.length === 0) return;
    const t = setTimeout(() => window.print(), 500);
    return () => clearTimeout(t);
  }, [autoprint, items.length]);

  return (
    <>
      <div className="appkit-print-hide" style={{ display: "flex", gap: "8px", marginBottom: "16px", alignItems: "center" }}>
        {onBack && <Button variant="ghost" onClick={onBack}>Back</Button>}
        <Button variant="outline" onClick={() => window.print()}>Print</Button>
        {onDownloadPdf && (
          <Button variant="primary" onClick={onDownloadPdf} disabled={isGeneratingPdf}>
            {isGeneratingPdf ? "Generating..." : "Download PDF"}
          </Button>
        )}
      </div>

      <style>{`@media print { .appkit-print-hide { display: none !important; } body { margin: 0; } }`}</style>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, auto)`, gap: "4mm", justifyContent: "start" }}>
        {items.map((item, i) => (
          <div key={i} style={{ pageBreakInside: "avoid" }}>{item}</div>
        ))}
      </div>
    </>
  );
}