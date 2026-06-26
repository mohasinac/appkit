"use client";

import React, { useRef, useCallback } from "react";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { Text } from "../../../ui/components/Typography";
import { Stack } from "../../../ui/components/Layout";

export interface BarcodeFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  /** Called when the scanner fires Enter after rapid character input (< 50 ms between keys). */
  onScan?: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  autoFocus?: boolean;
  readOnly?: boolean;
}

/**
 * Text field that detects USB/Bluetooth barcode scanner input.
 * Scanners type characters rapidly (< 50 ms per keydown) then send Enter.
 * onScan is called when Enter follows rapid input; manual typing is ignored.
 */
export function BarcodeField({
  label = "Barcode / Sticker ID",
  value,
  onChange,
  onScan,
  placeholder = "Scan or type barcode…",
  helperText,
  autoFocus,
  readOnly,
}: BarcodeFieldProps) {
  const lastKeyTime = useRef<number>(0);
  const buffer = useRef<string>("");

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const now = Date.now();
      if (e.key === "Enter") {
        e.preventDefault();
        if (buffer.current) {
          onScan?.(buffer.current);
          buffer.current = "";
        }
        return;
      }
      const interval = now - lastKeyTime.current;
      buffer.current = interval < 50 ? buffer.current + e.key : e.key;
      lastKeyTime.current = now;
    },
    [onScan],
  );

  return (
    <Stack gap="xs">
      <FieldInput
        name="barcodeId"
        label={label}
        type="text"
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        readOnly={readOnly}
      />
      {helperText && (
        <Text size="xs" color="muted">
          {helperText}
        </Text>
      )}
    </Stack>
  );
}
