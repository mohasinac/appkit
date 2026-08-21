"use client";
import React, { useContext } from "react";
import { Input } from "./Input";
import { Select, type SelectOption } from "./Select";
import { Textarea } from "./Textarea";
import { Label, Text, Span } from "./Typography";
import { ImageUpload, MediaUploadField } from "../../features/media";
import { FormShellContext } from "../forms/FormShell";

export interface FormFieldProps {
  label?: string;
  name: string;
  card?: boolean;
  type?:
    | "text"
    | "email"
    | "password"
    | "tel"
    | "number"
    | "datetime-local"
    | "textarea"
    | "select"
    | "image"
    | "media";
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  /** Override error — falls back to FormShell context error for this field */
  error?: string;
  /** Override touched — falls back to FormShell context touched state for this field */
  touched?: boolean;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  rows?: number;
  hint?: string;
  helpText?: string;
  options?: SelectOption[];
  onUpload?: (file: File) => Promise<string>;
  captureSource?: "file-only" | "camera-only" | "both";
  captureMode?: "photo" | "video" | "both";
  accept?: string;
  maxSizeMB?: number;
}

const CARD_CLASS = "appkit-form-field appkit-form-field--card";
const BASE_CLASS = "appkit-form-field";

export function FormField({
  label,
  name,
  card = false,
  type = "text",
  value = "",
  onChange,
  onBlur,
  error: errorProp,
  touched: touchedProp,
  placeholder,
  required = false,
  disabled = false,
  autoComplete,
  rows,
  hint,
  helpText,
  options = [],
  onUpload,
  captureSource,
  captureMode,
  accept,
  maxSizeMB,
}: FormFieldProps) {
  // Falls back to FormShellContext (the same context FieldInput/FieldSelect
  // read) whenever the caller doesn't pass an explicit error/touched prop —
  // an explicit prop always wins, preserving back-compat for the handful of
  // call sites that already manage their own error state manually.
  const ctx = useContext(FormShellContext);
  const error = errorProp ?? ctx?.errors[name];
  const touched = touchedProp ?? ctx?.touched[name];
  const showError = error
    ? touched != null
      ? touched && !!error
      : !!error
    : false;
  const inputId = `field-${name}`;
  const errorId = `${inputId}-error`;
  const describedBy = showError ? errorId : undefined;

  function handleFieldChange(newValue: string) {
    onChange?.(newValue);
    if (showError) ctx?.clearFieldError(name);
  }

  function handleFieldBlur() {
    ctx?.setFieldTouched(name);
    onBlur?.();
  }

  if (type === "image" && onUpload) {
    return (
      <div className={card ? CARD_CLASS : BASE_CLASS} data-section="formfield-div-505">
        {/* ImageUpload has no disabled prop of its own — every other type
            branch in this component forwards `disabled` to its underlying
            control (MediaUploadField/Select/Textarea/Input); this wrapper
            keeps the same contract for the image branch without requiring
            ImageUpload's own internals to change. */}
        <div
          aria-disabled={disabled || undefined}
          className={disabled ? "pointer-events-none opacity-60" : undefined}
        >
          <ImageUpload
            currentImage={value || undefined}
            onUpload={onUpload}
            onChange={(url) => handleFieldChange(url)}
            label={label ? `${label}${required ? " *" : ""}` : undefined}
            helperText={hint ?? helpText}
            captureSource={captureSource ?? "file-only"}
            accept={accept}
            maxSizeMB={maxSizeMB}
          />
        </div>
        {showError ? (
          <Text
            id={errorId}
            size="sm"
            variant="error"
            className="appkit-form-field__error"
            role="alert"
          >
            {error}
          </Text>
        ) : null}
      </div>
    );
  }

  if (type === "media" && onUpload) {
    return (
      <div className={card ? CARD_CLASS : BASE_CLASS} data-section="formfield-div-506">
        <MediaUploadField
          label={`${label || name}${required ? " *" : ""}`}
          value={value}
          onChange={(url) => handleFieldChange(url)}
          onUpload={onUpload}
          disabled={disabled}
          helperText={hint ?? helpText}
          captureSource={captureSource ?? "file-only"}
          captureMode={captureMode ?? "both"}
          accept={accept}
          maxSizeMB={maxSizeMB}
        />
        {showError ? (
          <Text
            id={errorId}
            size="sm"
            variant="error"
            className="appkit-form-field__error"
            role="alert"
          >
            {error}
          </Text>
        ) : null}
      </div>
    );
  }

  return (
    <div className={card ? CARD_CLASS : BASE_CLASS} data-section="formfield-div-507">
      {label ? (
        <Label htmlFor={inputId} className="appkit-form-field__label">
          {label}
          {required ? (
            <Span className="appkit-form-field__required">*</Span>
          ) : null}
        </Label>
      ) : null}

      {type === "select" ? (
        <Select
          id={inputId}
          name={name}
          value={value}
          onChange={(event) => handleFieldChange(event.target.value)}
          onBlur={handleFieldBlur}
          disabled={disabled}
          options={options}
          aria-required={required || undefined}
          aria-invalid={showError || undefined}
          aria-describedby={describedBy}
        />
      ) : type === "textarea" ? (
        <Textarea
          id={inputId}
          name={name}
          value={value}
          onChange={(event) => handleFieldChange(event.target.value)}
          onBlur={handleFieldBlur}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          aria-required={required || undefined}
          aria-invalid={showError || undefined}
          aria-describedby={describedBy}
        />
      ) : (
        <Input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={(event) => handleFieldChange(event.target.value)}
          onBlur={handleFieldBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-required={required || undefined}
          aria-invalid={showError || undefined}
          aria-describedby={describedBy}
        />
      )}

      {!showError && (hint || helpText) ? (
        <Text size="sm" variant="secondary" className="appkit-form-field__hint">
          {hint ?? helpText}
        </Text>
      ) : null}

      {showError ? (
        <Text
          id={errorId}
          size="sm"
          variant="error"
          className="appkit-form-field__error"
          role="alert"
        >
          {error}
        </Text>
      ) : null}
    </div>
  );
}

export default FormField;
