"use client"
import { useMemo } from "react";
import { Div } from "../components/Div";
import { normalizeRichTextHtml } from "../../utils/string.formatter";
import { useSiteSettings } from "../../core/hooks/useSiteSettings";
import { splitChartBlocks } from "./chart-blocks";
import { ChartFromJson } from "../components/Chart";

// --- Allowed HTML tags (safe subset — no script/object; iframe allowed for YouTube only) -------

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
  "iframe",
]);

/** Attributes allowed per tag. "*" means allowed on any tag. */
const ALLOWED_ATTRS: Record<string, string[]> = {
  "*": ["class", "id", "lang", "dir", "aria-label", "role", "tabindex"],
  a: ["href", "title", "target", "rel"],
  img: ["src", "alt", "width", "height", "loading", "data-align"],
  /*
   * `data-chart` carries a JSON ChartSpec that the renderer hydrates into
   * <Chart>. Safe to allow because it is DATA, never markup: it is read with
   * `getAttribute`, run through `JSON.parse`, and then validated field-by-field
   * by `parseChartSpec`, which accepts only a fixed `kind` enum, string labels
   * and finite numbers. Nothing in it reaches `innerHTML`, so a script payload
   * smuggled into the string fails validation and renders as an error message.
   *
   * 🛑 It must stay on `figure` only. Allowing it via "*" would let it ride on
   * an <a> or <iframe>, where the surrounding element's own attack surface is
   * the problem rather than the attribute.
   */
  figure: ["data-chart"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan", "scope"],
  ol: ["type", "start"],
  iframe: ["src", "width", "height", "frameborder", "allowfullscreen", "allow", "title", "loading"],
};

// --- Simple client-side sanitiser --------------------------------------------
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

      if (tag === "iframe") {
        const src = child.getAttribute("src") ?? "";
        const isYoutube =
          /^https:\/\/(www\.)?(youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)/.test(src.trim());
        if (!isYoutube) {
          node.replaceChild(document.createTextNode(""), child);
          continue;
        }
        // Wrap in responsive 16:9 container if parent isn't already one
        const wrapper = document.createElement("div");
        wrapper.className = "relative aspect-video w-full overflow-hidden rounded-lg my-4";
        child.setAttribute("class", "absolute inset-0 h-full w-full");
        child.setAttribute("loading", "lazy");
        node.replaceChild(wrapper, child);
        wrapper.appendChild(child);
        continue;
      }

      walk(child);
    }
  }

  walk(doc.body);
  return doc.body.innerHTML;
}

// --- RichText component ------------------------------------------------------

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
        .catch(console.error);
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
 * html={post.body}
 * highlightCode={(code, lang) =>
 * hljs.highlight(code, { language: lang || "plaintext", ignoreIllegals: true }).value
 * }
 * />
 * ```
   */
  highlightCode?: (code: string, lang: string) => string;
  /**
   * Render `<figure data-chart>` placeholders as live charts. Default true.
   *
   * Set `false` for untrusted user-generated content where an author should not
   * be able to mount a component at all — the placeholder then renders as the
   * empty `<figure>` it is. The JSON is still validated either way; this is
   * about whether a chart is an affordance on that surface.
   */
  charts?: boolean;
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
/**
 * Unwrap every `<a>` whose destination the site has closed, keeping its text.
 *
 * 🛑 THIS IS WHERE THE LAST DEAD LINKS WERE, and why six page-level sweeps
 * kept reporting "clean". Stored rich text is authored content that no page
 * template owns: a crawl of the live site on 2026-10-27 found `/scams`,
 * `/tools/authenticity` and `/blog` linked from the HOMEPAGE, and every one
 * of them was inside an FAQ ANSWER. Grepping a page for marketplace words
 * cannot see an href, and gating a section cannot see inside its prose.
 *
 * `RichText` is the single renderer for every stored HTML field on the site —
 * FAQ answers, legal pages, blog bodies, product descriptions — so one filter
 * here covers all of them.
 *
 * 🛑 UNWRAPPED, NOT DELETED. The sentence still reads: "the scam registry is
 * the place to report it" keeps its words and loses its link. Removing the
 * whole anchor would leave a gap mid-sentence, and removing the paragraph
 * would silently delete an admin's copy.
 *
 * Prefix-matched on a `/`-delimited boundary, the same rule as every other
 * gate — `/store` must not match `/stores`.
 */
function unwrapClosedLinks(html: string, closed: readonly string[]): string {
  if (closed.length === 0 || typeof document === "undefined") return html;
  const container = document.createElement("div");
  container.innerHTML = html;
  let changed = false;
  for (const a of Array.from(container.querySelectorAll("a[href]"))) {
    const raw = a.getAttribute("href") ?? "";
    if (!raw.startsWith("/")) continue;
    const path = raw.split(/[?#]/)[0]!.replace(/\/+$/, "") || "/";
    // `/en/blog` -> `/blog`: an admin pasting out of the address bar stores
    // the locale-prefixed form, which a raw comparison would miss.
    const bare = path.replace(/^\/[a-z]{2}(?=\/)/, "");
    const hit = closed.some(
      (p) => bare === p || bare.startsWith(`${p}/`) || path === p || path.startsWith(`${p}/`),
    );
    if (!hit) continue;
    a.replaceWith(...Array.from(a.childNodes));
    changed = true;
  }
  return changed ? container.innerHTML : html;
}

export function RichText({
  html,
  className = "",
  proseClass = "prose max-w-none dark:prose-invert",
  copyableCode = false,
  highlightCode,
  charts = true,
}: RichTextProps) {
  /*
   * Fails OPEN: no settings yet, or a failed fetch, leaves every link intact.
   * A transient error must not strip working links out of an admin's copy.
   */
  const { data: settings } = useSiteSettings<{ hiddenSurfacePrefixes?: string[] }>();
  const closedPrefixes = settings?.hiddenSurfacePrefixes ?? [];

  const safe = useMemo(() => {
    const sanitized = unwrapClosedLinks(
      sanitiseHtml(normalizeRichTextHtml(html)),
      closedPrefixes,
    );

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

  /*
   * Split AFTER sanitising, never before.
   *
   * The sanitiser round-trips through `DOMParser` and re-serialises, which
   * rewrites the single-quoted `data-chart='{"k":1}'` we emit into
   * double-quoted `data-chart="{&quot;k&quot;:1}"`. `splitChartBlocks` handles
   * both spellings precisely because of this step — splitting first would
   * leave chart segments that the sanitiser never got to inspect.
   */
  const segments = useMemo(
    () => (charts ? splitChartBlocks(safe) : [{ type: "html" as const, html: safe }]),
    [safe, charts],
  );

  // Fast path: no charts. Byte-identical to the pre-chart render.
  if (segments.length === 1 && segments[0].type === "html") {
    return (
      <Div
        ref={ref}
        className={`appkit-rich-text ${proseClass} ${className}`}
        dangerouslySetInnerHTML={{ __html: segments[0].html }}
      />
    );
  }

  return (
    <Div ref={ref} className={`appkit-rich-text ${proseClass} ${className}`}>
      {segments.map((seg, i) =>
        seg.type === "html" ? (
          <div
            key={`h${i}`}
            className="appkit-rich-text__seg"
            dangerouslySetInnerHTML={{ __html: seg.html }}
          />
        ) : (
          <ChartFromJson key={`c${i}`} json={seg.json} />
        ),
      )}
    </Div>
  );
}
