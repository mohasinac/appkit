"use client";

import React, { useState } from "react";
import { Button, Div, Span, Stack, Text } from "../../../../ui";

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
    <Div className={`rounded-lg border border-border bg-muted/40 ${__P.p4}`}>
      <Stack gap="sm">
        <Text className="font-medium">Your Digital Code</Text>
        {!revealed ? (
          <Stack gap="sm">
            {error && <Text className="text-sm text-destructive">{error}</Text>}
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
            <Div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 font-mono text-lg">
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
            </Div>
            {redemptionInstructions && (
              <Text className="text-sm text-muted-foreground">
                {redemptionInstructions}
              </Text>
            )}
          </Stack>
        )}
      </Stack>
    </Div>
  );
}
