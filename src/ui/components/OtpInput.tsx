"use client";

import React, { useRef, useId } from "react";
import { Label, Text } from "./Typography";

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  label?: React.ReactNode;
  error?: React.ReactNode;
  helperText?: React.ReactNode;
  disabled?: boolean;
  autoFocus?: boolean;
  inputMode?: "numeric" | "text";
  id?: string;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  label,
  error,
  helperText,
  disabled = false,
  autoFocus = false,
  inputMode = "numeric",
  id,
}: OtpInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const digits = value.split("").concat(Array(length).fill("")).slice(0, length);

  function focusAt(index: number) {
    inputsRef.current[index]?.focus();
  }

  function handleChange(index: number, char: string) {
    const sanitized = inputMode === "numeric" ? char.replace(/\D/g, "") : char;
    const next = digits.slice();
    next[index] = sanitized.slice(-1);
    onChange(next.join(""));
    if (sanitized && index < length - 1) focusAt(index + 1);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowLeft" && index > 0) { focusAt(index - 1); return; }
    if (e.key === "ArrowRight" && index < length - 1) { focusAt(index + 1); return; }
    if (e.key !== "Backspace") return;
    if (digits[index]) {
      const next = digits.slice();
      next[index] = "";
      onChange(next.join(""));
    } else if (index > 0) {
      focusAt(index - 1);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    const sanitized = inputMode === "numeric" ? pasted.replace(/\D/g, "") : pasted;
    const next = sanitized.slice(0, length).split("").concat(Array(length).fill("")).slice(0, length);
    onChange(next.join(""));
    const lastFilled = Math.min(sanitized.length, length - 1);
    focusAt(lastFilled);
  }

  return (
    <div className="w-full">
      {label && (
        <Label htmlFor={`${inputId}-0`} className="appkit-form-field__label mb-2">
          {label}
        </Label>
      )}
      <div className="flex gap-2" role="group" aria-labelledby={label ? `${inputId}-label` : undefined}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputsRef.current[i] = el; }}
            id={i === 0 ? `${inputId}-0` : undefined}
            type="text"
            inputMode={inputMode}
            maxLength={1}
            value={digit}
            disabled={disabled}
            autoFocus={autoFocus && i === 0}
            autoComplete="one-time-code"
            aria-label={`Digit ${i + 1} of ${length}`}
            className={[
              "appkit-input",
              "appkit-otp-input",
              error ? "appkit-input--error" : "",
            ].filter(Boolean).join(" ")}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
          />
        ))}
      </div>
      {error ? (
        <Text size="sm" variant="error" role="alert" className="mt-1.5">
          {error}
        </Text>
      ) : helperText ? (
        <Text size="sm" variant="secondary" className="mt-1.5">
          {helperText}
        </Text>
      ) : null}
    </div>
  );
}
