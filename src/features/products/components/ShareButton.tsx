"use client";
import { normalizeError } from "../../../errors/normalize";

import { useState } from "react";
import { Button } from "../../../ui/components/Button";

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
        // navigator.share rejects on user cancellation exactly as it does on a
        // real failure, so this is unreportable by construction — either way the
        // clipboard fallback below still gives the user the link.
      } catch (_err) {
        void normalizeError(_err);
      }
    }

    navigator.clipboard.writeText(url).catch(console.error);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      type="button"
      onClick={handleShare}
      gap="sm"
      rounded="lg"
      paddingX="sm"
      paddingY="xs"
      textSize="sm"
      weight="medium"
      textColor="muted"
      className={`hover:bg-[var(--appkit-color-surface)] ${className}`}
      aria-label="Share this page"
    >
      🔗 {copied ? "Link Copied!" : "Share"}
    </Button>
  );
}
