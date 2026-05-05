"use client";

import React, { useState, useTransition } from "react";
import { Button, Div, Input, Span, Text } from "../../../ui";
import { formatCurrency } from "../../../utils/number.formatter";

export interface MakeOfferButtonProps {
  productId: string;
  listedPrice: number;
  currency?: string;
  minOfferPercent?: number;
  /** Called with (productId, offerAmount, note?). Must return void or throw on error. */
  onMakeOffer: (productId: string, amount: number, note?: string) => Promise<void>;
  className?: string;
}

type State = "idle" | "confirm" | "loading" | "success" | "pending" | "error";

export function MakeOfferButton({
  productId,
  listedPrice,
  currency,
  minOfferPercent = 70,
  onMakeOffer,
  className = "",
}: MakeOfferButtonProps) {
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const minOffer = Math.round(listedPrice * (minOfferPercent / 100));
  const defaultOffer = Math.round(listedPrice * 0.9);
  const [offerAmount, setOfferAmount] = useState(Math.max(defaultOffer, minOffer));
  const [buyerNote, setBuyerNote] = useState("");

  const fmt = (n: number) => currency ? formatCurrency(n, currency) : `₹${n.toLocaleString()}`;

  function handleOpenConfirm() {
    setState("confirm");
  }

  function handleCancel() {
    setState("idle");
  }

  function handleAmountChange(raw: string) {
    const parsed = parseInt(raw.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(parsed)) setOfferAmount(parsed);
  }

  function handleSubmit() {
    if (offerAmount < minOffer) {
      setErrorMsg(`Minimum offer is ${fmt(minOffer)}`);
      setState("error");
      return;
    }
    if (offerAmount >= listedPrice) {
      setErrorMsg(`Offer must be below the listed price of ${fmt(listedPrice)}`);
      setState("error");
      return;
    }
    setState("loading");
    startTransition(async () => {
      try {
        await onMakeOffer(productId, offerAmount, buyerNote || undefined);
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
        <Div>
          <Text className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Make an Offer
          </Text>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Listed at {fmt(listedPrice)} · Minimum offer: {fmt(minOffer)}
          </Text>
        </Div>
        <Div className="space-y-1">
          <Text className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Your offer amount</Text>
          <Input
            type="number"
            value={String(offerAmount)}
            onChange={(e) => handleAmountChange(e.target.value)}
            min={minOffer}
            max={listedPrice - 1}
            step={1}
            aria-label="Offer amount"
          />
          <Text className="text-xs text-zinc-400 dark:text-zinc-500">
            Must be between {fmt(minOffer)} and {fmt(listedPrice - 1)}
          </Text>
        </Div>
        <Div className="space-y-1">
          <Text className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Note to seller (optional)</Text>
          <Input
            type="text"
            value={buyerNote}
            onChange={(e) => setBuyerNote(e.target.value)}
            placeholder="E.g. Bundle deal, long-time fan..."
            maxLength={300}
            aria-label="Note to seller"
          />
        </Div>
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">
          The seller will accept, decline, or suggest a counter price.
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
            disabled={isPending || offerAmount < minOffer}
          >
            {isPending ? "Sending…" : `Send ${fmt(offerAmount)}`}
          </Button>
        </Div>
      </Div>
    );
  }

  if (state === "error") {
    return (
      <Div className={`rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 space-y-2 ${className}`}>
        <Text className="text-xs text-red-600 dark:text-red-400 text-center">{errorMsg}</Text>
        <Div className="flex gap-2">
          <Button variant="ghost" size="sm" className="flex-1" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="secondary" size="sm" className="flex-1" onClick={() => setState("confirm")}>
            Try Again
          </Button>
        </Div>
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
