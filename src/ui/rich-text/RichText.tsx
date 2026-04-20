import { useMemo } from "react";
import { Div } from "../components/Div";

// ─── Allowed HTML tags (safe subset — no script/iframe/object) ───────────────

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
  img: ["src", "alt", "width", "height", "loading", "data-align"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan", "scope"],
  ol: ["type", "start"],
};

// ─── Simple client-side sanitiser ────────────────────────────────────────────
// We avoid a third-party sanitizer dependency to keep this module lightweight.
// For user-supplied HTML, also sanitize server-side before storage.

function sanitiseHtml(dirty: string): string {
  if (typeof window === "undefined") {
    return dirty;
  }

  const dp = new DOMParser();
  const doc = dp.parseFromString(dirty, "text/html");

  function walk(node: Element): void {
    const children = Array.from(node.children);
    for (const child of children) {
      const tag = child.tagName.toLowerCase();

      if (!ALLOWED_TAGS.has(tag)) {
        node.replaceChild(
          document.createTextNode(child.textContent ?? ""),
          child,
        );
        continue;
      }

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

      if (tag === "a") {
        const href = child.getAttribute("href") ?? "";
        if (/^javascript:/i.test(href.trim())) {
          child.removeAttribute("href");
        }
        if (href && !href.startsWith("/") && !href.startsWith("#")) {
          child.setAttribute("rel", "noopener noreferrer");
          child.setAttribute("target", "_blank");
        }
      }

      if (tag === "img") {
        const src = child.getAttribute("src") ?? "";
        if (/^data:/i.test(src.trim())) {
          child.removeAttribute("src");
        }
      }

      walk(child);
    }
  }

  walk(doc.body);
  return doc.body.innerHTML;
}

// ─── RichText component ──────────────────────────────────────────────────────

/** Adds interactive copy buttons to every `<pre>` block in a container. */
function attachCopyButtons(container: HTMLDivElement) {
  container.querySelectorAll<HTMLElement>("pre").forEach((pre) => {
    if (pre.querySelector("[data-copy-btn]")) return;

    pre.style.position = "relative";

    const btn = document.createElement("button");
    btn.dataset.copyBtn = "1";
    btn.type = "button";
    btn.setAttribute("aria-label", "Copy code");
    btn.textContent = "Copy";
    btn.style.cssText =
      "position:absolute;top:8px;right:8px;padding:2px 10px;font-size:11px;font-family:inherit;" +
      "border-radius:6px;border:1px solid rgba(148,163,184,.4);background:rgba(30,41,59,.75);" +
      "color:#e2e8f0;cursor:pointer;line-height:1.6;user-select:none;transition:background .15s;";

    btn.addEventListener("click", () => {
      const code =
        pre.querySelector("code")?.textContent ?? pre.textContent ?? "";
      if (!navigator.clipboard) return;
      navigator.clipboard
        .writeText(code)
        .then(() => {
          btn.textContent = "Copied!";
          setTimeout(() => {
            btn.textContent = "Copy";
          }, 1800);
        })
        .catch(() => {});
    });

    pre.appendChild(btn);
  });
}

export interface RichTextProps {
  /** Raw HTML string, typically rendered from a rich-text editor payload. */
  html: string;
  /** Extra class names on the wrapper div. */
  className?: string;
  /** Tailwind prose class variant. */
  proseClass?: string;
  /**
   * When true, every `<pre>` code block gets an overlay "Copy" button that
   * copies the code text to the clipboard on click. Defaults to false.
   */
  copyableCode?: boolean;
  /**
   * Optional syntax highlighter applied to every `<pre><code>` block.
   * Called with (rawCode, languageName) and should return highlighted HTML.
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
 * RichText renders sanitised HTML from a CMS / ProseMirror output.
 *
 * Security: client-side DOM-based sanitiser strips disallowed tags/attrs.
 * For defence-in-depth, also sanitise on the server before storing.
 *
 * Usage:
 * ```tsx
 * <RichText html={blogPost.body} className="max-w-2xl" />
 * <RichText html={desc} copyableCode />
 * ```
 */
export function RichText({
  html,
  className = "",
  proseClass = "prose max-w-none dark:prose-invert",
  copyableCode = false,
  highlightCode,
}: RichTextProps) {
  const safe = useMemo(() => {
    const sanitized = sanitiseHtml(html);

    if (!highlightCode || typeof document === "undefined") return sanitized;

    const container = document.createElement("div");
    container.innerHTML = sanitized;
    container.querySelectorAll("pre > code").forEach((codeEl) => {
      const langClass = Array.from(codeEl.classList).find((c) =>
        c.startsWith("language-"),
      );
      const lang = langClass ? langClass.replace("language-", "") : "plaintext";
      codeEl.innerHTML = highlightCode(codeEl.textContent ?? "", lang);
    });
    return container.innerHTML;
  }, [html, highlightCode]);

  const ref = (el: HTMLDivElement | null) => {
    if (el && copyableCode) {
      attachCopyButtons(el);
    }
  };

  return (
    <Div
      ref={ref}
      className={`appkit-rich-text ${proseClass} ${className}`}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
