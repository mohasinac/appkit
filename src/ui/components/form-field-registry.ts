import type { ReactNode } from "react";

/**
 * Runtime renderer registry for FormField.tsx's "image"/"media" branches.
 *
 * FormField.tsx is a ui/ primitive, but the image/video upload widgets it
 * renders for those two types are a features/media concern (crop, trim,
 * YouTube embed, etc.) -- a static import there is the edge that put
 * react-advanced-cropper's CSS into appkit's server graph (see FormField.tsx's
 * own header comment). This registry lets FormField call a renderer without
 * importing from features/ at all; features/media registers itself into it.
 *
 * Right-sized for "2 branches, same default behavior at every call site" --
 * a per-call-site render-prop would force every one of FormField's existing
 * callers to start passing a slot just to keep working.
 */

export interface FormFieldImageRendererProps {
  currentImage: string | undefined;
  onUpload: (file: File) => Promise<string>;
  onChange: (url: string) => void;
  label: string | undefined;
  helperText: string | undefined;
  captureSource: "file-only" | "camera-only" | "both";
  accept: string | undefined;
  maxSizeMB: number | undefined;
}

export interface FormFieldMediaRendererProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  onUpload: (file: File) => Promise<string>;
  disabled: boolean;
  helperText: string | undefined;
  captureSource: "file-only" | "camera-only" | "both";
  captureMode: "photo" | "video" | "both";
  accept: string | undefined;
  maxSizeMB: number | undefined;
}

export type FormFieldImageRenderer = (props: FormFieldImageRendererProps) => ReactNode;
export type FormFieldMediaRenderer = (props: FormFieldMediaRendererProps) => ReactNode;

const registry = new Map<"image" | "media", FormFieldImageRenderer | FormFieldMediaRenderer>();

export function registerFormFieldRenderer(type: "image", renderer: FormFieldImageRenderer): void;
export function registerFormFieldRenderer(type: "media", renderer: FormFieldMediaRenderer): void;
export function registerFormFieldRenderer(
  type: "image" | "media",
  renderer: FormFieldImageRenderer | FormFieldMediaRenderer,
): void {
  registry.set(type, renderer);
}

export function getFormFieldRenderer(type: "image"): FormFieldImageRenderer | undefined;
export function getFormFieldRenderer(type: "media"): FormFieldMediaRenderer | undefined;
export function getFormFieldRenderer(
  type: "image" | "media",
): FormFieldImageRenderer | FormFieldMediaRenderer | undefined {
  return registry.get(type);
}
