"use client";

import { useState } from "react";
import { normalizeError } from "../../../errors/normalize";
import { Code } from "../../../ui/components/Semantic";
import { Row } from "../../../ui/components/Layout";
import { Button } from "../../../ui/components/Button";

export interface CouponCodeCopyRowProps {
  /** The code to copy. Rendered verbatim — it is what the buyer must type. */
  code: string;
  /** Accessible context, e.g. the coupon name. Appended to the button label for screen readers. */
  ariaContext?: string;
}

/**
 * The code + "Copy code" row. ONE implementation, shared by `EventOfferCard`
 * (offer events, one coupon) and `AttachedCouponsSection` (events and blog
 * posts, several).
 *
 * Extracted rather than copied: this is the second consumer, and the
 * Duplication Framework's keep-it rule ("Rule of Three — two copies is
 * observation") is outranked here by its consolidate rule #2, the bug-fix
 * multiplier. The clipboard call has a real failure mode — it is denied
 * outright on insecure origins and by permission — and a fix to that handling
 * in one copy would silently not reach the other.
 */
export function CouponCodeCopyRow({ code, ariaContext }: CouponCodeCopyRowProps) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_err) {
      /*
       * Clipboard access is denied outright on insecure origins and by user
       * permission. The button simply never flips to "Copied", and the code is
       * still on screen to select by hand — so the failure costs convenience,
       * never the ability to use the coupon. Nothing is shown to the user,
       * because there is nothing they could do about it.
       */
      void normalizeError(_err);
    }
  };

  return (
    <Row surface="muted" padding="inline" align="center" gap="3" rounded="lg">
      <Code className="flex-1" weight="bold" size="base" color="primary">
        {code}
      </Code>
      <Button
        type="button"
        variant="outline"
        onClick={copyCode}
        /*
         * The visible label flips to "Copied!" but the accessible name keeps
         * naming the coupon — several of these render in one grid, and three
         * buttons all reading "Copy code" give a screen-reader user no way to
         * tell which code they are about to take.
         */
        aria-label={ariaContext ? `Copy coupon code ${code} — ${ariaContext}` : `Copy coupon code ${code}`}
      >
        {copied ? "Copied!" : "Copy code"}
      </Button>
    </Row>
  );
}
