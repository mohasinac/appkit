"use client";

import React, { useState, useTransition } from "react";
import { Button, Div, Input, LoginRequiredModal, Modal, Span, Stack, Text } from "../../../ui";
import { isAuthError } from "../../../utils/auth-error";
import { formatCurrency } from "../../../utils/number.formatter";

import { normalizeError } from "../../../errors/normalize";
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

const CLS_SUCCESS_BOX = "rounded-xl border border-success dark:border-success bg-success-surface p-4 text-center space-y-1";
const CLS_PENDING_BOX = "rounded-xl border border-warning dark:border-warning bg-warning-surface dark:bg-warning-surface p-4 text-center space-y-1";
const CLS_PENDING_TITLE = "text-sm font-medium text-warning dark:text-warning";
const CLS_PENDING_BODY = "text-xs text-warning dark:text-warning";

function isActiveOfferError(msg: string): boolean {
  return msg.includes("active offer") || msg.includes("ACTIVE_OFFER");
}

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
  const [showLoginModal, setShowLoginModal] = useState(false);
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

  function handleOfferError(err: unknown) {
    if (isAuthError(err)) {
      setState("idle");
      setShowLoginModal(true);
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      if (isActiveOfferError(msg)) {
        setState("pending");
      } else {
        setErrorMsg(msg || "Could not send offer. Please try again.");
        setState("error");
      }
    }
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
        void normalizeError(err);
        handleOfferError(err);
      }
    });
  }

  if (state === "success") {
    return (
      <Div className={`${CLS_SUCCESS_BOX} ${className}`}>
        <Span size="lg">🎉</Span>
        <Text className="text-success" size="sm" weight="medium">
          Offer sent!
        </Text>
        <Text className="text-success" size="xs">
          The seller will review your offer and respond shortly.
        </Text>
      </Div>
    );
  }

  if (state === "pending") {
    return (
      <Div className={`${CLS_PENDING_BOX} ${className}`}>
        <Span size="lg">⏳</Span>
        <Text className={CLS_PENDING_TITLE}>
          Offer Pending
        </Text>
        <Text className={CLS_PENDING_BODY}>
          You already have an offer on this item. Check My Offers for updates.
        </Text>
      </Div>
    );
  }

  const modalOpen = state === "confirm" || state === "loading" || state === "error";

  return (
    <>
      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="You need to be signed in to make an offer. Please log in or create an account to continue."
      />
      <Button
        variant="ghost"
        size="md"
        className={`w-full border border-zinc-300 dark:border-zinc-600 ${className}`}
        onClick={handleOpenConfirm}
      >
        Make Offer
      </Button>
      <Modal
        isOpen={modalOpen}
        onClose={handleCancel}
        size="md"
        title="Make an offer"
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isPending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={isPending || offerAmount < minOffer}
            >
              {isPending ? "Sending…" : `Send offer of ${fmt(offerAmount)}`}
            </Button>
          </>
        }
      >
        <Stack gap="md">
          <Text size="xs" color="muted">
            Listed at {fmt(listedPrice)} · Minimum offer: {fmt(minOffer)}
          </Text>
          <Div className="space-y-1">
            <Text size="xs" weight="medium" color="muted">Your offer amount</Text>
            <Input
              type="number"
              value={String(offerAmount)}
              onChange={(e) => handleAmountChange(e.target.value)}
              min={minOffer}
              max={listedPrice - 1}
              step={1}
              aria-label="Offer amount"
            />
            <Text className="text-zinc-400 dark:text-zinc-400" size="xs">
              Must be between {fmt(minOffer)} and {fmt(listedPrice - 1)}
            </Text>
          </Div>
          <Div className="space-y-1">
            <Text size="xs" weight="medium" color="muted">Note to seller (optional)</Text>
            <Input
              type="text"
              value={buyerNote}
              onChange={(e) => setBuyerNote(e.target.value)}
              placeholder="E.g. Bundle deal, long-time fan…"
              maxLength={300}
              aria-label="Note to seller"
            />
          </Div>
          <Text size="xs" color="muted">
            The seller will accept, decline, or suggest a counter price.
          </Text>
          {state === "error" && (
            <Text className="text-error" size="xs">{errorMsg}</Text>
          )}
        </Stack>
      </Modal>
    </>
  );
}
