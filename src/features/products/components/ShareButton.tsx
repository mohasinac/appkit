"use client";

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
      } catch {
        // user cancelled or browser blocked — fall through to clipboard
      }
    }

    navigator.clipboard.writeText(url).catch(() => {}); // audit-silent-catch-ok: clipboard denial is non-fatal; "Copied" toast simply won't show
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${className}`}
      aria-label="Share this page"
    >
      🔗 {copied ? "Link Copied!" : "Share"}
    </button>
  );
}
