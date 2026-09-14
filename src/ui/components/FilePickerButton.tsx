"use client";
import React, { useId, useRef } from "react";
import { Button } from "./Button";
import type { ButtonProps } from "./Button";

/**
 * A button that opens the native file picker.
 *
 * 🛑 THE RAW `<input type="file">` BELONGS HERE, and only here. Rule #9 bans raw
 * form elements in product code and points every case at a primitive; there was
 * no primitive for a file picker, so the one feature that needed one
 * (`DigitalContentPoolManager`) had to carry a raw input plus a suppression
 * marker — and `audit-no-suppression-comments` is strict-zero and says, in its
 * own header, "do NOT add a new marker or exception". The only close available
 * was to extend the primitive layer, which is exactly what Root Cause #22 says
 * to do before reaching for a marker.
 *
 * Deliberately NOT built on `MediaUploadField`. That component drives the public
 * `/api/media/*` pipeline, which ends by minting a `/media/{shortId}` URL served
 * with no authentication — correct for product photography, catastrophic for a
 * paid download. This primitive hands the caller a `File` and has no opinion
 * about where the bytes go.
 *
 * The input is visually hidden rather than styled, because a styled file input
 * cannot be made to match `<Button>` across browsers — Safari and Firefox each
 * render their own immovable "Choose file" text inside it.
 */
export interface FilePickerButtonProps
  extends Omit<ButtonProps, "onClick" | "type" | "children"> {
  /** Called with the chosen file. Never called with null. */
  onFile: (file: File) => void;
  /** Native `accept` string, e.g. `"image/*"`. Omit to accept anything. */
  accept?: string;
  children: React.ReactNode;
}

// No forwardRef: appkit's <Button> does not accept a ref, so there is nothing
// to forward one to. Adding the plumbing would be a prop that silently does
// nothing, which is worse than its absence.
export function FilePickerButton({
  onFile,
  accept,
  children,
  ...buttonProps
}: FilePickerButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputId = useId();

  return (
    <>
      <Button
        {...buttonProps}
        type="button"
        onClick={() => inputRef.current?.click()}
      >
        {children}
      </Button>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        hidden
        onChange={(ev) => {
          const file = ev.target.files?.[0];
          /*
           * Reset BEFORE handing the file on. Without it, picking the same file
           * twice in a row fires no change event the second time — the value is
           * unchanged — and the control silently does nothing, which reads as a
           * broken button rather than as a no-op.
           */
          ev.target.value = "";
          if (file) onFile(file);
        }}
      />
    </>
  );
}
