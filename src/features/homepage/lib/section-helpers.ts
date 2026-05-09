/** Shared string helpers for homepage section rendering. */

/** Strip leading emoji/symbols that admins sometimes prefix onto DB titles. */
export function cleanTitle(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  const cleaned = raw.replace(/^[^\p{L}\p{N}]+/u, "").trim();
  return cleaned || raw;
}

/** Parse a ProseMirror/Tiptap JSON welcome description to plain text, or return as-is. */
export function parseWelcomeDescription(description: string | undefined): string {
  if (!description) return "";
  try {
    const parsed = JSON.parse(description) as {
      content?: Array<{ content?: Array<{ text?: string }> }>;
    };
    const extracted = parsed.content
      ?.flatMap((node) => node.content ?? [])
      .map((leaf) => leaf.text ?? "")
      .join(" ")
      .trim();
    return extracted || description;
  } catch {
    return description;
  }
}
