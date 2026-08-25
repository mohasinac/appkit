"use client";

import React, { useState, useTransition } from "react";
import {
  Button,
  Div,
  LoginRequiredModal,
  Modal,
  Span,
  Stack,
  Text,
} from "../../../ui";
import { Form } from "../../../ui/components/Form";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";
import { applyZodIssues } from "../../../ui/forms/FormShell";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { makeOfferFormSchema } from "../../seller/schemas/offer-forms";
import {
  DEFAULT_MIN_OFFER_PERCENT,
  minOfferAmount,
} from "../../../_internal/shared/features/offers/config";
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

const CLS_SUCCESS_BOX =
  "rounded-xl border border-success dark:border-success bg-success-surface p-[var(--appkit-space-4)] text-left space-y-1";
const CLS_PENDING_BOX =
  "rounded-xl border border-warning dark:border-warning bg-warning-surface dark:bg-warning-surface p-[var(--appkit-space-4)] text-left space-y-1";
const CLS_PENDING_TITLE = "text-[length:var(--appkit-text-sm)] font-medium text-warning dark:text-warning";
const CLS_PENDING_BODY = "text-[length:var(--appkit-text-xs)] text-warning dark:text-warning";

/**
 * "You already have an offer on this listing" is a legitimate, expected outcome
 * rather than a failure, so it gets its own panel instead of an error message —
 * but the server signals it through an ordinary rejection, so it has to be
 * recognised from the message. Matched on both the human string and the error
 * code because `makeOffer` throws `ERROR_MESSAGES.OFFER.ACTIVE_OFFER_EXISTS`
 * while `OFFER_ERROR_CODES.ALREADY_ACTIVE` is what a coded rejection carries.
 */
function isActiveOfferError(msg: string): boolean {
  return msg.includes("active offer") || msg.includes("ACTIVE_OFFER");
}

type State = "idle" | "open" | "success" | "pending";

export function MakeOfferButton({
  productId,
  listedPrice,
  currency,
  minOfferPercent = DEFAULT_MIN_OFFER_PERCENT,
  onMakeOffer,
  className = "",
}: MakeOfferButtonProps) {
  const [state, setState] = useState<State>("idle");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fmt = (n: number) => (currency ? formatCurrency(n, currency) : `₹${n.toLocaleString()}`);

  // The SAME floor the server enforces — shared so the input can never seed or
  // accept an amount `makeOffer` would then reject.
  const minOffer = minOfferAmount(listedPrice, minOfferPercent);
  const schema = makeOfferFormSchema({ listedPrice, minOffer, formatAmount: fmt });

  const [offerAmount, setOfferAmount] = useState(
    String(Math.max(minOfferAmount(listedPrice, 90), minOffer)),
  );
  const [buyerNote, setBuyerNote] = useState("");

  function submit(
    setFieldError: (name: string, error: string | null) => void,
    clearErrors: () => void,
  ) {
    clearErrors();
    const parsed = schema.safeParse({ offerAmount, buyerNote: buyerNote || undefined });
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues, setFieldError);
      return;
    }
    startTransition(async () => {
      try {
        await onMakeOffer(productId, parsed.data.offerAmount, parsed.data.buyerNote);
        setState("success");
      } catch (err: unknown) {
        void normalizeError(err);
        if (isAuthError(err)) {
          setState("idle");
          setShowLoginModal(true);
          return;
        }
        const msg = err instanceof Error ? err.message : String(err);
        if (isActiveOfferError(msg)) {
          setState("pending");
          return;
        }
        // Server-side rejections land on the amount field — it is the only
        // field the server can actually be objecting to, and Rule #9.6 wants
        // them inline rather than in a banner.
        setFieldError("offerAmount", msg || "Could not send offer. Please try again.");
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
        <Text className={CLS_PENDING_TITLE}>Offer Pending</Text>
        <Text className={CLS_PENDING_BODY}>
          You already have an offer on this item. Check My Offers for updates.
        </Text>
      </Div>
    );
  }

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
        border="strong"
        className={`w-full ${className}`}
        onClick={() => setState("open")}
      >
        Make Offer
      </Button>
      <Modal isOpen={state === "open"} onClose={() => setState("idle")} size="md" title="Make an offer">
        <Form schema={schema} onSubmit={(e) => e.preventDefault()}>
          {({ setFieldError, clearErrors }) => (
            <Stack gap="md">
              <Text size="xs" color="muted">
                Listed at {fmt(listedPrice)} · Minimum offer: {fmt(minOffer)}
              </Text>

              <FieldInput
                name="offerAmount"
                type="number"
                label="Your offer amount"
                required
                value={offerAmount}
                onChange={(value) => {
                  setOfferAmount(value);
                  clearErrors();
                }}
                min={minOffer}
                max={listedPrice - 1}
                step={1}
                aria-label="Offer amount"
              />
              <Text size="xs" color="faint">
                Must be between {fmt(minOffer)} and {fmt(listedPrice - 1)}
              </Text>

              <FieldInput
                name="buyerNote"
                type="text"
                label="Note to seller (optional)"
                value={buyerNote}
                onChange={setBuyerNote}
                placeholder="E.g. Bundle deal, long-time fan…"
                maxLength={300}
                aria-label="Note to seller"
              />

              <Text size="xs" color="muted">
                The seller will accept, decline, or suggest a counter price.
              </Text>

              <FormErrorSummary />

              <Stack gap="xs">
                <Button
                  action={ACTIONS.PRODUCT["make-offer"]}
                  variant="primary"
                  size="sm"
                  type="button"
                  isLoading={isPending}
                  disabled={isPending}
                  onClick={() => submit(setFieldError, clearErrors)}
                >
                  {isPending ? "Sending…" : `Send offer of ${fmt(Number(offerAmount) || 0)}`}
                </Button>
                <Button variant="ghost" size="sm" type="button" onClick={() => setState("idle")} disabled={isPending}>
                  Cancel
                </Button>
              </Stack>
            </Stack>
          )}
        </Form>
      </Modal>
    </>
  );
}
