import React from "react";
import { Input } from "./Input";
import { Select, type SelectOption } from "./Select";
import { Textarea } from "./Textarea";
import { Label, Text, Span } from "./Typography";
import { ImageUpload, MediaUploadField } from "../../features/media";

export interface FormFieldProps {
  label?: string;
  name: string;
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
  error?: string;
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

export function FormField({
  label,
  name,
  type = "text",
  value = "",
  onChange,
  onBlur,
  error,
  touched,
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
  const showError = error
    ? touched != null
      ? touched && !!error
      : !!error
    : false;
  const inputId = `field-${name}`;
  const errorId = `${inputId}-error`;
  const describedBy = showError ? errorId : undefined;

  if (type === "image" && onUpload) {
    return (
      <div className="appkit-form-field" data-section="formfield-div-505">
        <ImageUpload
          currentImage={value || undefined}
          onUpload={onUpload}
          onChange={(url) => onChange?.(url)}
          label={label ? `${label}${required ? " *" : ""}` : undefined}
          helperText={hint ?? helpText}
          captureSource={captureSource ?? "file-only"}
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

  if (type === "media" && onUpload) {
    return (
      <div className="appkit-form-field" data-section="formfield-div-506">
        <MediaUploadField
          label={`${label || name}${required ? " *" : ""}`}
          value={value}
          onChange={(url) => onChange?.(url)}
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
    <div className="appkit-form-field" data-section="formfield-div-507">
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
          onChange={(event) => onChange?.(event.target.value)}
          onBlur={onBlur}
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
          onChange={(event) => onChange?.(event.target.value)}
          onBlur={onBlur}
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
          onChange={(event) => onChange?.(event.target.value)}
          onBlur={onBlur}
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
