"use client";

import React, { useState } from "react";
import { Div, Stack, Text } from "../../../../ui";

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
    <Div className="rounded-lg border border-border bg-muted/40 p-4">
      <Stack gap="sm">
        <Text className="font-medium">Your Digital Code</Text>
        {!revealed ? (
          <Stack gap="sm">
            {error && <Text className="text-sm text-destructive">{error}</Text>}
            <button
              type="button"
              disabled={pending}
              onClick={handleReveal}
              className="w-full rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {pending ? "Loading…" : "Reveal Code"}
            </button>
          </Stack>
        ) : (
          <Stack gap="sm">
            <Div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 font-mono text-lg">
              <span className="flex-1 select-all">{revealed.code}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
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
