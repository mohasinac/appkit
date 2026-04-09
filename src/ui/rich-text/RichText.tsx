"use client";

import React, { useMemo } from "react";
import { Div } from "../components/Div";

// ─── Allowed HTML tags (safe subset — no script/iframe/object) ────────────────

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "del",
  "ins",
  "b",
  "i",
  "mark",
  "code",
  "pre",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "a",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "caption",
  "figure",
  "figcaption",
  "img",
  "picture",
  "span",
  "div",
  "section",
  "article",
]);

/** Attributes allowed per tag. "*" means allowed on any tag. */
const ALLOWED_ATTRS: Record<string, string[]> = {
  "*": ["class", "id", "lang", "dir", "aria-label", "role", "tabindex"],
  a: ["href", "title", "target", "rel"],
  img: ["src", "alt", "width", "height", "loading"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan", "scope"],
  ol: ["type", "start"],
};

// ─── Simple client-side sanitiser ─────────────────────────────────────────────
// We avoid 3rd-party DOMPurify to keep the bundle lean.
// This runs only on nodes rendered from trusted ProseMirror output (staff CMS).
// For user-supplied HTML, add a server-side DOMPurify step before storing.

function sanitiseHtml(dirty: string): string {
  if (typeof window === "undefined") {
    // SSR: return as-is; real sanitisation should happen before storage.
    return dirty;
  }

  const dp = new DOMParser();
  const doc = dp.parseFromString(dirty, "text/html");

  function walk(node: Element): void {
    const children = Array.from(node.children);
    for (const child of children) {
      const tag = child.tagName.toLowerCase();

      if (!ALLOWED_TAGS.has(tag)) {
        // Replace disallowed tag with its text content
        node.replaceChild(
          document.createTextNode(child.textContent ?? ""),
          child,
        );
        continue;
      }

      // Strip disallowed attributes
      const attrNames = Array.from(child.attributes).map((a) => a.name);
      const allowed = [
        ...(ALLOWED_ATTRS["*"] ?? []),
        ...(ALLOWED_ATTRS[tag] ?? []),
      ];
      for (const attr of attrNames) {
        if (!allowed.includes(attr)) {
          child.removeAttribute(attr);
        }
      }

      // Force external links to be safe
      if (tag === "a") {
        const href = child.getAttribute("href") ?? "";
        if (/^javascript:/i.test(href)) {
          child.removeAttribute("href");
        }
        if (!href.startsWith("/") && !href.startsWith("#")) {
          child.setAttribute("rel", "noopener noreferrer");
          child.setAttribute("target", "_blank");
        }
      }

      // Strip src from img if it's a data URI (can exfiltrate data)
      if (tag === "img") {
        const src = child.getAttribute("src") ?? "";
        if (/^data:/i.test(src)) {
          child.removeAttribute("src");
        }
      }

      walk(child);
    }
  }

  walk(doc.body);
  return doc.body.innerHTML;
}

// ─── RichText component ───────────────────────────────────────────────────────

export interface RichTextProps {
  /** Raw HTML string — typically from ProseMirror / Tiptap JSON rendered to HTML. */
  html: string;
  /** Extra class names on the wrapper div. */
  className?: string;
  /** Tailwind prose class variant. Defaults to "prose dark:prose-invert". */
  proseClass?: string;
  /**
   * Optional syntax highlighter applied to every `<pre><code>` block.
   * Called with (rawCode, languageName) — return the highlighted HTML string.
   *
   * The language name is derived from the `language-*` CSS class on the `<code>`
   * element (e.g. "ts", "js", "python"). Falls back to `"plaintext"` when absent.
   *
   * @example
   * ```tsx
   * import hljs from "highlight.js";
   * <RichText
   *   html={post.body}
   *   highlightCode={(code, lang) =>
   *     hljs.highlight(code, { language: lang || "plaintext", ignoreIllegals: true }).value
   *   }
   * />
   * ```
   */
  highlightCode?: (code: string, lang: string) => string;
}

/**
 * RichText — renders sanitised HTML from a CMS / ProseMirror output.
 *
 * Security: client-side DOM-based sanitiser strips disallowed tags/attrs.
 * For defence-in-depth, also sanitise on the server before storing.
 *
 * Usage:
 * ```tsx
 * <RichText html={blogPost.body} className="max-w-2xl" />
 * ```
 */
export function RichText({
  html,
  className = "",
  proseClass = "prose dark:prose-invert max-w-none",
  highlightCode,
}: RichTextProps) {
  const safe = useMemo(() => {
    const sanitized = sanitiseHtml(html);

    if (!highlightCode || typeof document === "undefined") return sanitized;

    // Apply syntax highlighting to <pre><code> blocks after sanitisation
    const container = document.createElement("div");
    container.innerHTML = sanitized;
    container.querySelectorAll("pre > code").forEach((codeEl) => {
      const langClass = Array.from(codeEl.classList).find((c) =>
        c.startsWith("language-"),
      );
      const lang = langClass ? langClass.replace("language-", "") : "plaintext";
      const highlighted = highlightCode(codeEl.textContent ?? "", lang);
      codeEl.innerHTML = highlighted;
    });
    return container.innerHTML;
  }, [html, highlightCode]);

  return (
    <Div
      className={`${proseClass} ${className}`}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
