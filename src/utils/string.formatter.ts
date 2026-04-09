/**
 * String Formatting and Manipulation Utilities
 */

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function capitalizeWords(str: string): string {
  return str
    .split(" ")
    .map((word) => capitalize(word))
    .join(" ");
}

export function truncate(
  str: string,
  maxLength: number,
  suffix: string = "...",
): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

export function truncateWords(
  str: string,
  wordCount: number,
  suffix: string = "...",
): string {
  const words = str.split(" ");
  if (words.length <= wordCount) return str;
  return words.slice(0, wordCount).join(" ") + suffix;
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

/** Escapes HTML special characters to prevent XSS attacks. */
export function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };
  return str.replace(/[&<>"'/]/g, (char) => map[char]);
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function maskString(
  str: string,
  visibleStart: number = 4,
  visibleEnd: number = 4,
  maskChar: string = "*",
): string {
  if (str.length <= visibleStart + visibleEnd) return str;
  const start = str.slice(0, visibleStart);
  const end = str.slice(-visibleEnd);
  const masked = maskChar.repeat(str.length - visibleStart - visibleEnd);
  return start + masked + end;
}

export function randomString(length: number = 10): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const indices = new Uint8Array(length);
  globalThis.crypto.getRandomValues(indices);
  return Array.from(indices, (i) => chars[i % chars.length]).join("");
}

export function isEmptyString(str: string | null | undefined): boolean {
  return !str || str.trim().length === 0;
}

// ─── ProseMirror / TipTap JSON → HTML ────────────────────────────────────────

interface ProseMirrorMark {
  type: string;
  attrs?: Record<string, string | number | boolean | null>;
}

interface ProseMirrorNode {
  type: string;
  text?: string;
  attrs?: Record<string, string | number | boolean | null>;
  marks?: ProseMirrorMark[];
  content?: ProseMirrorNode[];
}

function renderProseMirrorNodes(nodes: ProseMirrorNode[]): string {
  return nodes.map(renderProseMirrorNode).join("");
}

function renderProseMirrorNode(node: ProseMirrorNode): string {
  switch (node.type) {
    case "doc":
      return renderProseMirrorNodes(node.content ?? []);
    case "paragraph": {
      const inner = renderProseMirrorNodes(node.content ?? []);
      return inner ? `<p>${inner}</p>` : "<p></p>";
    }
    case "text": {
      let text = escapeHtml(node.text ?? "");
      if (node.marks) {
        for (const mark of node.marks) {
          if (mark.type === "bold") text = `<strong>${text}</strong>`;
          else if (mark.type === "italic") text = `<em>${text}</em>`;
          else if (mark.type === "underline") text = `<u>${text}</u>`;
          else if (mark.type === "strike") text = `<s>${text}</s>`;
          else if (mark.type === "code") text = `<code>${text}</code>`;
          else if (mark.type === "link") {
            const rawHref = String(mark.attrs?.href ?? "#").trim();
            const safe = /^(https?:\/\/|mailto:|\/|#)/i.test(rawHref)
              ? rawHref
              : "#";
            const href = safe.replace(
              /[&"<>]/g,
              (c) =>
                ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[
                  c
                ] ?? c,
            );
            text = `<a href="${href}" rel="noopener noreferrer">${text}</a>`;
          }
        }
      }
      return text;
    }
    case "heading": {
      const level = (node.attrs?.level as number) ?? 2;
      return `<h${level}>${renderProseMirrorNodes(node.content ?? [])}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${renderProseMirrorNodes(node.content ?? [])}</ul>`;
    case "orderedList":
      return `<ol>${renderProseMirrorNodes(node.content ?? [])}</ol>`;
    case "listItem":
      return `<li>${renderProseMirrorNodes(node.content ?? [])}</li>`;
    case "blockquote":
      return `<blockquote>${renderProseMirrorNodes(node.content ?? [])}</blockquote>`;
    case "codeBlock":
      return `<pre><code>${renderProseMirrorNodes(node.content ?? [])}</code></pre>`;
    case "hardBreak":
      return "<br>";
    case "horizontalRule":
      return "<hr>";
    default:
      return renderProseMirrorNodes(node.content ?? []);
  }
}

/**
 * Converts a ProseMirror/TipTap JSON document string to HTML.
 * Falls back to returning the value unchanged if it is not a ProseMirror doc.
 */
export function proseMirrorToHtml(value: string): string {
  if (!value) return value;
  try {
    const parsed = JSON.parse(value) as ProseMirrorNode;
    if (parsed?.type === "doc") {
      return renderProseMirrorNodes(parsed.content ?? []);
    }
    return value;
  } catch {
    return value;
  }
}
