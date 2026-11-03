"use client";

/**
 * Registers the features/media renderers for FormField.tsx's "image"/"media"
 * branches into ui/components/form-field-registry.ts, so FormField never
 * statically imports from features/ directly (see that file's own header
 * comment for the incident this closes).
 *
 * Loaded ONLY via the dynamic `import()` inside FormField.tsx itself, not
 * wired from any barrel's top-level code. A barrel-level side effect
 * (tried first from client.ts, then from ui/index.ts) does not survive
 * Turbopack in the browser — confirmed live with a planted console.log
 * that neither barrel's explicit top-level call to
 * registerMediaFormFieldRenderers() ever actually ran when the browser
 * resolved FormField through it, even though a direct Node ESM import of
 * the same compiled file ran it correctly. A dynamic import() called from
 * inside a function body is not subject to that elision.
 *
 * Idempotency-guarded regardless: FormField.tsx already caches the
 * `import()` promise so this only loads once, but the guard here is cheap
 * insurance against any other future caller.
 */

import { registerFormFieldRenderer } from "../../../ui/components/form-field-registry";
import { ImageUpload } from "./ImageUpload";
import { MediaUploadField } from "./MediaUploadField";

let registered = false;

export function registerMediaFormFieldRenderers(): void {
  if (registered) return;
  registered = true;

  registerFormFieldRenderer("image", (props) => <ImageUpload {...props} />);
  registerFormFieldRenderer("media", (props) => <MediaUploadField {...props} />);
}

registerMediaFormFieldRenderers();
