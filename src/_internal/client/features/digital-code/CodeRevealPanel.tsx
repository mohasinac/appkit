"use client";
import { normalizeError } from "../../../../errors/normalize";

import React, { useState } from "react";
import { Button, Div, Row, Span, Stack, Text } from "../../../../ui";
const __P = {
  p4: "p-4",
} as const;

export interface RevealedCode {
  code: string;
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
      void normalizeError(e);
      setError(e instanceof Error ? e.message : "Could not retrieve code");
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
        <Text weight="medium">Your Digital Code</Text>
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
            <Row className="border border-border bg-background px-3 font-mono text-lg" padding="y-xs" align="center" gap="sm" rounded="md">
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
            {redemptionInstructions && (
              <Text className="text-muted-foreground" size="sm">
                {redemptionInstructions}
              </Text>
            )}
          </Stack>
        )}
      </Stack>
    </Div>
  );
}
