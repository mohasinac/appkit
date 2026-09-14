"use client";
import { normalizeError } from "../../../../errors/normalize";
import { toUserMessage } from "../../../../errors/error-display-map";

import React, { useState } from "react";
import { Button, Div, Row, Span, Stack, Text } from "../../../../ui";
const __P = {
  p4: "p-[var(--appkit-space-4)]",
} as const;

/**
 * What the buyer was actually delivered.
 *
 * A "digital code" listing delivers digital CONTENT — a redemption string is
 * only its commonest shape. `contentKind` is optional and absent means `"code"`,
 * so a delivery recorded before assets existed renders exactly as it always did.
 */
export interface RevealedCode {
  contentKind?: "code" | "image" | "file";
  /** Present only for `contentKind: "code"`. */
  code?: string;
  /**
   * Present for the asset kinds. Points at the AUTHENTICATED download route,
   * never at Storage and never at `/media/` — see the route's own header for
   * why that distinction is the whole security model here.
   */
  downloadUrl?: string;
  fileName?: string;
  contentType?: string;
  /** Seller-authored redemption help, carried by the reveal response. */
  redemptionInstructions?: string;
  orderId: string;
  claimedAt?: Date | string;
  expiresAt?: Date | string;
}

export interface CodeRevealPanelProps {
  orderId: string;
  redemptionInstructions?: string;
  /** Injected from the page so the panel never hard-codes the API path. */
  fetchCode: (orderId: string) => Promise<RevealedCode>;
}

export function CodeRevealPanel({
  orderId,
  redemptionInstructions,
  fetchCode,
}: CodeRevealPanelProps) {
  const [pending, setPending] = useState(false);
  const [revealed, setRevealed] = useState<RevealedCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleReveal() {
    setPending(true);
    setError(null);
    try {
      const data = await fetchCode(orderId);
      setRevealed(data);
    } catch (e) {
      const normalized = normalizeError(e);
      setError(
        toUserMessage(normalized.code, undefined, {
          fallback: "Could not retrieve your code. Please try again.",
        }),
      );
    } finally {
      setPending(false);
    }
  }

  async function handleCopy() {
    if (!revealed?.code) return;
    await navigator.clipboard.writeText(revealed.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Div className={`border border-border bg-muted/40 ${__P.p4}`} rounded="lg">
      <Stack gap="sm">
        <Text weight="medium">
          {/*
           * Names what was actually delivered. "Your Digital Code" over a
           * Download button is a small lie, and the whole point of `contentKind`
           * is that the three are different things.
           */}
          {revealed && (revealed.contentKind ?? "code") !== "code"
            ? "Your Digital Content"
            : "Your Digital Code"}
        </Text>
        {!revealed ? (
          <Stack gap="sm">
            {error && <Text className="text-destructive" size="sm">{error}</Text>}
            <Button
              type="button"
              variant="primary"
              size="lg"
              isLoading={pending}
              disabled={pending}
              onClick={handleReveal}
              className="w-full"
            >
              Reveal Code
            </Button>
          </Stack>
        ) : (
          <Stack gap="sm">
            {(revealed.contentKind ?? "code") === "code" ? (
              <Row textSize="lg" className="border border-border bg-background font-mono" padding="inlineSm" align="center" gap="sm" rounded="md">
                <Span className="flex-1 select-all">{revealed.code}</Span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </Row>
            ) : (
              /*
               * 🛑 A LINK, not an <img>/<MediaImage>. Rendering the asset inline
               * would need a URL a browser can GET without our session
               * semantics, and this one is a `private, no-store` authenticated
               * download that always answers `Content-Disposition: attachment`.
               * An <img src> pointed at it would show a broken image, and
               * "fixing" that by moving the bytes somewhere renderable is
               * precisely what publishes a paid good — see the download route's
               * header.
               *
               * Not a <Button onClick={fetch}> either: a same-origin anchor lets
               * the browser own the download, including resume and the file
               * name, and never materialises the bytes in JS memory.
               */
              <Row className="border border-border bg-background" padding="inlineSm" align="center" gap="sm" rounded="md">
                <Span className="flex-1 truncate">
                  {revealed.fileName ?? "Your download"}
                </Span>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    if (revealed.downloadUrl) window.location.assign(revealed.downloadUrl);
                  }}
                >
                  Download
                </Button>
              </Row>
            )}
            {/*
              * Prefer what the reveal returned. The `redemptionInstructions`
              * PROP was never passed by either mount site, so this branch was
              * dead: the text lives on the product and both pages build their
              * rows from the order. The prop survives as an override for a
              * caller that genuinely has better copy.
              */}
            {(redemptionInstructions ?? revealed.redemptionInstructions) && (
              <Text className="text-muted-foreground" size="sm">
                {redemptionInstructions ?? revealed.redemptionInstructions}
              </Text>
            )}
          </Stack>
        )}
      </Stack>
    </Div>
  );
}
