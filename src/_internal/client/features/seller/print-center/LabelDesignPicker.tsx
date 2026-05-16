"use client";
import React from "react";
import { Row } from "../../../../../ui/components/Layout";
import { Button } from "../../../../../ui/components/Button";
import { Input } from "../../../../../ui/components/Input";
import { Text } from "../../../../../ui/components/Typography";
import { type LabelDesign, LABEL_DESIGN_STORAGE_KEY } from "./types";

interface LabelDesignPickerProps {
  value: LabelDesign;
  onChange: (design: LabelDesign) => void;
}

const TEMPLATES: LabelDesign["template"][] = ["minimal", "detailed", "branded"];

const SCHEMES: { value: LabelDesign["colorScheme"]; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "store-primary", label: "Brand" },
];

const SHOW_FIELDS: { key: keyof LabelDesign["show"]; label: string }[] = [
  { key: "logo", label: "Logo" },
  { key: "price", label: "Price" },
  { key: "stock", label: "Stock" },
  { key: "barcode", label: "Barcode" },
  { key: "location", label: "Location" },
  { key: "listingTypeBadge", label: "Type badge" },
];

export function LabelDesignPicker({ value, onChange }: LabelDesignPickerProps) {
  const set = <K extends keyof LabelDesign>(key: K, val: LabelDesign[K]) => {
    const next = { ...value, [key]: val };
    onChange(next);
    try { localStorage.setItem(LABEL_DESIGN_STORAGE_KEY, JSON.stringify(next)); } catch { /* noop */ }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px" }}>
      <>
        <Text variant="muted" style={{ fontSize: "11px", fontWeight: 600, marginBottom: "6px", display: "block" }}>Template</Text>
        <Row gap="xs">
          {TEMPLATES.map(t => (
            <Button key={t} variant={value.template === t ? "primary" : "outline"} size="sm" onClick={() => set("template", t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Button>
          ))}
        </Row>
      </>

      <>
        <Text variant="muted" style={{ fontSize: "11px", fontWeight: 600, marginBottom: "6px", display: "block" }}>Color</Text>
        <Row gap="xs">
          {SCHEMES.map(s => (
            <Button key={s.value} variant={value.colorScheme === s.value ? "primary" : "outline"} size="sm" onClick={() => set("colorScheme", s.value)}>
              {s.label}
            </Button>
          ))}
        </Row>
      </>

      <>
        <Text variant="muted" style={{ fontSize: "11px", fontWeight: 600, marginBottom: "6px", display: "block" }}>Size (mm)</Text>
        <Row gap="sm">
          <Input
            label="W"
            type="number"
            value={value.size.widthMm}
            onChange={e => set("size", { ...value.size, widthMm: Number(e.target.value) })}
            style={{ width: "70px" }}
          />
          <Input
            label="H"
            type="number"
            value={value.size.heightMm}
            onChange={e => set("size", { ...value.size, heightMm: Number(e.target.value) })}
            style={{ width: "70px" }}
          />
        </Row>
      </>

      <>
        <Text variant="muted" style={{ fontSize: "11px", fontWeight: 600, marginBottom: "6px", display: "block" }}>Show</Text>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
          {SHOW_FIELDS.map(f => (
            <label key={f.key} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px" }}>
              <input
                type="checkbox"
                checked={value.show[f.key]}
                onChange={e => set("show", { ...value.show, [f.key]: e.target.checked })}
              />
              {f.label}
            </label>
          ))}
        </div>
      </>
    </div>
  );
}