"use client";
import React, { useContext, useEffect, useId, useState } from "react";
import { Input } from "./Input";
import { Select, type SelectOption } from "./Select";
import { Textarea } from "./Textarea";
import { Text } from "./Typography";
import { FieldLabel } from "../forms/FieldLabel";
import { FormShellContext } from "../forms/FormShell";
/*
 * 🛑 NO STATIC IMPORT OF ImageUpload/MediaUploadField HERE, EVER.
 *
 * This is a UI PRIMITIVE; those two are a features/media concern (crop,
 * trim, YouTube embed). A prior static import reaching into the
 * features/media barrel pulled in ImageEditor, which imports
 * `react-advanced-cropper/dist/style.css` — Node cannot load CSS at any
 * path, so that one line put a third-party stylesheet in appkit's SERVER
 * graph: server.js -> GoogleReviewsSection -> ui/index -> FormField ->
 * features/media/index -> ImageEditor -> …/style.css, which is what made
 * `serverExternalPackages` fail with ERR_UNKNOWN_FILE_EXTENSION. It was
 * also one of the edges in the 43-module `ui` <-> `features/media` import
 * cycle audit-import-cycles.mjs tracks.
 *
 * getFormFieldRenderer() calls into a runtime registry instead — zero
 * STATIC imports from features/.
 *
 * 🛑 THE REGISTRY IS FILLED BY A DYNAMIC import() BELOW, NOT BY SOME OTHER
 * MODULE'S TOP-LEVEL SIDE EFFECT. That was the first design (wired from
 * client.ts, then from ui/index.ts) and it does not survive Turbopack in
 * the browser: confirmed live with a planted console.log that a barrel
 * re-exporting FormField — even one with its OWN explicit top-level call to
 * the registration function — never executes that call when the browser
 * resolves FormField through it. A direct Node ESM import of the same
 * compiled file runs it correctly, so this is specifically a bundler
 * barrel-transparency optimization (consistent with this package's
 * `"sideEffects": false`), not a module-evaluation-order bug. A dynamic
 * `import()` called from inside a function body cannot be elided by that
 * optimization — see ensureMediaFormFieldRenderers below.
 */
import { getFormFieldRenderer } from "./form-field-registry";
import { normalizeError } from "../../errors/normalize";

let mediaRenderersPromise: Promise<unknown> | null = null;
/**
 * Loads features/media's register-form-field-renderers module (which
 * populates the registry as its own side effect) at most once, and caches
 * the in-flight promise so concurrent FormField instances share one load.
 */
function ensureMediaFormFieldRenderers(): Promise<unknown> {
  if (!mediaRenderersPromise) {
    mediaRenderersPromise = import("../../features/media/upload/register-form-field-renderers");
  }
  return mediaRenderersPromise;
}

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
    | "date"
    | "datetime-local"
    | "textarea"
    | "select"
    | "image"
    | "media";
  value?: string;
  /**
   * Native `min` / `max` bounds, forwarded to the underlying `<input>`.
   *
   * 🛑 A BROWSER HINT, never the enforcement. `<input type="date" max>` stops
   * the picker offering a later day and is trivially bypassed by typing or by
   * posting the request directly — so every `max` here must have a matching
   * server-side refusal, and the two must derive from the same constant or
   * they will disagree. The pre-order delivery date is the worked example:
   * `preOrderDeliveryMaxInputValue()` feeds this prop and
   * `checkPreOrderDeliveryDate()` refuses the write, both from
   * `PREORDER_MAX_DELIVERY_DAYS`.
   *
   * Only reaches the `<input>` branch — `select`/`textarea`/`image`/`media`
   * have nothing to bound.
   */
  min?: string | number;
  max?: string | number;
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
  min,
  max,
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
  const reactId = useId();
  /*
   * 🛑 UNIQUE PER INSTANCE. This was `field-${name}`, so two fields sharing a
   * name on one page produced two elements with the SAME id — `/auth/login`
   * shipped two `id="field-email"` (the sign-in form and the footer
   * newsletter).
   *
   * That is not cosmetic. `htmlFor` resolves to the FIRST element with the
   * id, so the second field's label points at the first field's input: the
   * label is present in the markup and the input has no accessible name, which
   * is what an accessibility pass reports as an unlabelled field. Clicking the
   * second label also focuses the first input.
   */
  const inputId = `field-${name}-${reactId}`;
  const errorId = `${inputId}-error`;
  const describedBy = showError ? errorId : undefined;

  // Kicks off the dynamic import the first time this instance needs a
  // renderer the registry doesn't have yet, then re-renders once it
  // resolves. A no-op on every render after the registry is populated —
  // `ensureMediaFormFieldRenderers()` caches its promise, so N mounted
  // FormField instances share ONE dynamic import, not one each.
  const [, forceRerender] = useState(0);
  const needsMediaRenderer = (type === "image" || type === "media") && !!onUpload;
  useEffect(() => {
    if (!needsMediaRenderer) return;
    const alreadyRegistered = type === "image" ? getFormFieldRenderer("image") : getFormFieldRenderer("media");
    if (alreadyRegistered) return;
    let cancelled = false;
    ensureMediaFormFieldRenderers()
      .then(() => {
        if (!cancelled) forceRerender((n) => n + 1);
      })
      .catch((err) => {
        const normalized = normalizeError(err);
        if (process.env.NODE_ENV !== "production") {
          console.error("[FormField] failed to load the image/media renderer:", normalized.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [needsMediaRenderer, type]);

  function handleFieldChange(newValue: string) {
    onChange?.(newValue);
    if (showError) ctx?.clearFieldError(name);
  }

  function handleFieldBlur() {
    ctx?.setFieldTouched(name);
    onBlur?.();
  }

  if (type === "image" && onUpload) {
    const ImageRenderer = getFormFieldRenderer("image");
    if (!ImageRenderer) {
      // Brief and expected on first mount — the useEffect above just kicked
      // off the dynamic import; a failure already logged to console.error
      // there. Not an error state: a form can render several times before
      // the registry is populated, same as any other lazy-loaded chunk.
      return <div className={card ? CARD_CLASS : BASE_CLASS} data-section="formfield-div-505" />;
    }
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
          <ImageRenderer
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
    const MediaRenderer = getFormFieldRenderer("media");
    if (!MediaRenderer) {
      // See the "image" branch above — same brief, expected lazy-load gap.
      return <div className={card ? CARD_CLASS : BASE_CLASS} data-section="formfield-div-506" />;
    }
    return (
      <div className={card ? CARD_CLASS : BASE_CLASS} data-section="formfield-div-506">
        <MediaRenderer
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
      {/*
        🛑 THIS WAS THE DRIFTED COPY. Its required marker was `>*<` where the
        three `Field*` wrappers had `> *<`, so the asterisk sat flush against
        the last letter of the label on every screen using `FormField` and
        spaced on every screen using the wrappers. Nobody chose that — it is
        what four copies of five lines become. `FieldLabel` is now the only
        implementation, which also means the leading space is a decision made
        once rather than a coincidence held in four places.
      */}
      {label ? (
        <FieldLabel htmlFor={inputId} required={required}>
          {label}
        </FieldLabel>
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
          min={min}
          max={max}
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
