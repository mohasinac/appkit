"use client";
import { normalizeError } from "../../../errors/normalize";

import { useState } from "react";

interface ShareButtonProps {
  title?: string;
  text?: string;
  className?: string;
}

export function ShareButton({ title, text, className = "" }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: title ?? document.title, text, url });
        return;
      } catch (_err) {
        void normalizeError(_err);
        // user cancelled or browser blocked — fall through to clipboard
      }
    }

    navigator.clipboard.writeText(url).catch(console.error);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-[var(--appkit-color-border)] px-3 py-1.5 text-sm font-medium text-[var(--appkit-color-text-muted)] hover:bg-[var(--appkit-color-surface)] transition-colors ${className}`}
      aria-label="Share this page"
    >
      🔗 {copied ? "Link Copied!" : "Share"}
    </button>
  );
}
