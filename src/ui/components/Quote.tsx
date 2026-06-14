import type { ReactNode } from "react";

/** Quote — primitive for inline `<q>` (short inline quotation). */
export type QuoteTone = "default" | "muted" | "brand" | "accent";

export interface QuoteProps {
  children: ReactNode;
  cite?: string;
  tone?: QuoteTone;
  /** Use a `<blockquote>` instead of inline `<q>` for multi-line excerpts. */
  block?: boolean;
}

const TONE_CLS: Record<QuoteTone, string> = {
  default: "text-[var(--appkit-color-text)]",
  muted: "text-[var(--appkit-color-text-muted)]",
  brand: "text-[var(--appkit-color-primary)]",
  accent: "text-[var(--appkit-color-secondary)]",
};

export function Quote({ children, cite, tone = "default", block = false }: QuoteProps) {
  if (block) {
    return (
      <blockquote
        cite={cite}
        // audit-variant-ok: Quote(block) is the catalogued primitive for
        // <blockquote>. tone comes from typed enum.
        className={`border-l-4 border-[var(--appkit-color-border)] pl-4 italic ${TONE_CLS[tone]}`}
      >
        {children}
      </blockquote>
    );
  }
  return (
    <q
      cite={cite}
      // audit-variant-ok: Quote is the catalogued primitive for <q>.
      className={TONE_CLS[tone]}
    >
      {children}
    </q>
  );
}
