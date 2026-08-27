"use client";

import React, { useEffect, useMemo, useRef } from "react";

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  minHeightClassName?: string;
  placeholder?: string;
}

type ToolbarAction = {
  label: string;
  title: string;
  run: () => void;
};

// Matches exactly what this editor's own toolbar (bold/italic/underline/
// lists/link/clear-formatting) and typing can legitimately produce.
// Anything else — <script>, <img onerror=...>, <iframe>, <svg>, <style>,
// <form>, event-handler attributes — can only have arrived via paste, and is
// dropped entirely rather than risk it either executing live in the editor
// or being persisted and re-rendered elsewhere as stored XSS.
const ALLOWED_TAGS = new Set([
  "B", "STRONG", "I", "EM", "U", "S", "STRIKE",
  "UL", "OL", "LI", "A", "BR", "DIV", "SPAN", "P",
]);

function isSafeHref(href: string): boolean {
  const trimmed = href.trim();
  // Same rule as string.formatter.ts's applyMark: allow http(s)/mailto, a
  // single leading "/" (same-site relative path, NOT "//host" protocol-
  // relative), or "#" — reject everything else including javascript:.
  return /^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(trimmed);
}

function sanitizeAttribute(el: HTMLElement, attr: Attr): void {
  const isSafeAnchorHref = el.tagName === "A" && attr.name.toLowerCase() === "href";
  if (!isSafeAnchorHref) {
    el.removeAttribute(attr.name);
    return;
  }
  if (!isSafeHref(attr.value)) el.setAttribute("href", "#");
}

function sanitizeElement(root: DocumentFragment | HTMLElement, el: HTMLElement): void {
  if (!ALLOWED_TAGS.has(el.tagName)) {
    root.removeChild(el);
    return;
  }
  Array.from(el.attributes).forEach((attr) => sanitizeAttribute(el, attr));
  sanitizeChildren(el);
}

function sanitizeChildren(root: DocumentFragment | HTMLElement): void {
  Array.from(root.childNodes).forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      sanitizeElement(root, child as HTMLElement);
    } else if (child.nodeType !== Node.TEXT_NODE) {
      root.removeChild(child);
    }
  });
}

function sanitizeRichTextHtml(html: string): string {
  if (typeof document === "undefined" || !html) return "";
  const template = document.createElement("template");
  template.innerHTML = html;
  sanitizeChildren(template.content);
  return template.innerHTML;
}

export function RichTextEditor({
  value,
  onChange,
  disabled = false,
  className = "",
  minHeightClassName = "min-h-[180px]",
  placeholder = "Write formatted content...",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  const emitChange = () => {
    if (!editorRef.current) return;
    const raw = editorRef.current.innerHTML;
    const sanitized = sanitizeRichTextHtml(raw);
    // Only touch the live DOM (which would reset caret position) when
    // sanitization actually changed something — a no-op for every normal
    // keystroke/toolbar action, since those only ever produce allowlisted
    // markup; only a malicious paste triggers this branch.
    if (sanitized !== raw) {
      editorRef.current.innerHTML = sanitized;
    }
    onChange(sanitized);
  };

  const exec = (command: string, commandValue?: string) => {
    if (disabled || typeof document === "undefined") return;
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  };

  const toolbarActions = useMemo<ToolbarAction[]>(
    () => [
      { label: "B", title: "Bold", run: () => exec("bold") },
      { label: "I", title: "Italic", run: () => exec("italic") },
      { label: "U", title: "Underline", run: () => exec("underline") },
      {
        label: "• List",
        title: "Bulleted list",
        run: () => exec("insertUnorderedList"),
      },
      {
        label: "1. List",
        title: "Numbered list",
        run: () => exec("insertOrderedList"),
      },
      {
        label: "Link",
        title: "Insert link",
        run: () => {
          if (typeof window === "undefined") return;
          const href = window.prompt("Enter URL", "https://");
          if (!href) return;
          exec("createLink", href);
        },
      },
      {
        label: "Clear",
        title: "Clear formatting",
        run: () => exec("removeFormat"),
      },
    ],
    [],
  );

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Sanitize on every incoming `value` too — this is the stored-XSS path:
    // previously-saved content (e.g. loaded from Firestore) must not be
    // trusted just because it was already persisted.
    const safeValue = sanitizeRichTextHtml(value);
    if (editor.innerHTML !== safeValue) {
      editor.innerHTML = safeValue;
    }
  }, [value]);

  return (
    <div
      className={`appkit-rich-text-editor rounded-lg border border-zinc-200 bg-[var(--appkit-color-surface)] border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] ${className}`}
     data-section="richtexteditor-div-582">
      <div className="appkit-rich-text-editor__toolbar flex flex-wrap gap-1 border-b p-2 border-[var(--appkit-color-border)]" data-section="richtexteditor-div-583">
        {toolbarActions.map((action) => (
          <button
            key={action.title}
            type="button"
            title={action.title}
            onClick={action.run}
            disabled={disabled}
            className="appkit-rich-text-editor__btn rounded px-2 py-1 text-xs font-medium transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 text-[var(--appkit-color-text-muted)]"
          >
            {action.label}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        role="textbox"
        aria-label="Rich text editor"
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={emitChange}
        className={`prose prose-sm max-w-none p-3 focus:outline-none dark:prose-invert ${minHeightClassName} ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
      />
    </div>
  );
}
