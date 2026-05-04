"use client";

import React, { useState, useTransition } from "react";
import { Button, Div, Span, Text } from "../../../ui";

export interface MakeOfferButtonProps {
  productId: string;
  listedPrice: number;
  minOfferPercent?: number;
  /** Called with (productId, computedOfferAmount). Must return void or throw on error. */
  onMakeOffer: (productId: string, amount: number, note?: string) => Promise<void>;
  className?: string;
}

type State = "idle" | "confirm" | "loading" | "success" | "pending" | "error";

export function MakeOfferButton({
  productId,
  listedPrice,
  minOfferPercent = 70,
  onMakeOffer,
  className = "",
}: MakeOfferButtonProps) {
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const offerAmount = Math.max(
    Math.round(listedPrice * (minOfferPercent / 100)),
    Math.round(listedPrice * 0.85),
  );

  function handleOpenConfirm() {
    setState("confirm");
  }

  function handleCancel() {
    setState("idle");
  }

  function handleSubmit() {
    setState("loading");
    startTransition(async () => {
      try {
        await onMakeOffer(productId, offerAmount);
        setState("success");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("active offer") || msg.includes("ACTIVE_OFFER")) {
          setState("pending");
        } else {
          setErrorMsg(msg || "Could not send offer. Please try again.");
          setState("error");
        }
      }
    });
  }

  if (state === "success") {
    return (
      <Div className={`rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center space-y-1 ${className}`}>
        <Span className="text-lg">🎉</Span>
        <Text className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
          Offer sent!
        </Text>
        <Text className="text-xs text-emerald-700 dark:text-emerald-400">
          The seller will review your offer and respond shortly.
        </Text>
      </Div>
    );
  }

  if (state === "pending") {
    return (
      <Div className={`rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-center space-y-1 ${className}`}>
        <Span className="text-lg">⏳</Span>
        <Text className="text-sm font-medium text-amber-800 dark:text-amber-300">
          Offer Pending
        </Text>
        <Text className="text-xs text-amber-700 dark:text-amber-400">
          You already have an offer on this item. Check My Offers for updates.
        </Text>
      </Div>
    );
  }

  if (state === "confirm") {
    return (
      <Div className={`rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/60 p-4 space-y-3 ${className}`}>
        <Text className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Send a negotiation offer to the seller?
        </Text>
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">
          The seller will review your offer and accept, decline, or suggest another price. You will be notified of their response.
        </Text>
        <Div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={handleCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? "Sending…" : "Send Offer"}
          </Button>
        </Div>
      </Div>
    );
  }

  if (state === "error") {
    return (
      <Div className={`space-y-2 ${className}`}>
        <Button
          variant="ghost"
          size="md"
          className="w-full border border-zinc-300 dark:border-zinc-600"
          onClick={() => setState("idle")}
        >
          Make Offer
        </Button>
        <Text className="text-xs text-red-600 dark:text-red-400 text-center">{errorMsg}</Text>
      </Div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="md"
      className={`w-full border border-zinc-300 dark:border-zinc-600 ${className}`}
      onClick={handleOpenConfirm}
    >
      Make Offer
    </Button>
  );
}
