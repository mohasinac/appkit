import React from "react";

export interface RichTextRendererProps {
  html?: string | null;
  className?: string;
  proseClass?: string;
}

/**
 * SSR-safe HTML renderer for admin/CMS-authored rich text content.
 *
 * Works as a React Server Component — no browser APIs, no `"use client"`.
 * Content is assumed to have been sanitized at save time via RichTextEditor.
 *
 * For user-generated content or untrusted HTML, use <RichText> instead
 * (client-only, runs the DOM-based sanitizer).
 */
export function RichTextRenderer({
  html,
  className = "",
  proseClass = "prose max-w-none dark:prose-invert",
}: RichTextRendererProps) {
  if (!html) return null;
  return (
    <div
      className={`appkit-rich-text ${proseClass} ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
