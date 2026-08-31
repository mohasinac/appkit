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
import { applyZodIssues } from "../../../ui/forms/apply-zod-issues";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { makeOfferFormSchema } from "../../seller/schemas/offer-forms";
import { minOfferAmount, type OfferBounds } from "../../../_internal/shared/features/offers/config";
import { isAuthError } from "../../../utils/auth-error";
import { formatCurrency } from "../../../utils/number.formatter";

import { normalizeError } from "../../../errors/normalize";

export interface MakeOfferButtonProps {
  productId: string;
  listedPrice: number;
  currency?: string;
  /**
   * The amounts this listing accepts, from `resolveOfferBounds()`.
   *
   * 🛑 Required, and deliberately not derivable here. This component used to
   * compute its own floor from `minOfferPercent`, which is a second copy of a
   * rule the server also owns — and a listing whose only purchase path is an
   * offer has bounds that no percentage can express (`min === max === price`
   * for a request to buy). Passing the resolved object means whatever this
   * form accepts, `makeOffer` accepts.
   */
  bounds: OfferBounds;
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
  bounds,
  onMakeOffer,
  className = "",
}: MakeOfferButtonProps) {
  const [state, setState] = useState<State>("idle");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fmt = (n: number) => (currency ? formatCurrency(n, currency) : `₹${n.toLocaleString()}`);

  // The SAME bounds the server enforces — passed in, never recomputed, so the
  // input can neither seed nor accept an amount `makeOffer` would reject.
  const schema = makeOfferFormSchema({ listedPrice, bounds, formatAmount: fmt });

  /*
   * A buy request has one legal amount, so it is seeded at the price and the
   * field is read-only — an editable box whose every other value is invalid is
   * a trap, not a choice. Otherwise open at 90% of the asking price, clamped
   * into the listing's own floor and ceiling.
   */
  const [offerAmount, setOfferAmount] = useState(
    String(
      bounds.isBuyRequest
        ? bounds.min
        : Math.min(Math.max(minOfferAmount(listedPrice, 90), bounds.min), bounds.max),
    ),
  );
  const [buyerNote, setBuyerNote] = useState("");

  function submit(
    setFieldError: (name: string, error: string | null) => void,
    clearErrors: () => void,
    markSubmitAttempted: () => void,
  ) {
    // type="button" — no native submit, so unhide the summary here.
    markSubmitAttempted();
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
          {bounds.isBuyRequest ? "Request sent!" : "Offer sent!"}
        </Text>
        <Text className="text-success" size="xs">
          The seller will review your {bounds.isBuyRequest ? "request" : "offer"} and
          respond shortly.
        </Text>
      </Div>
    );
  }

  if (state === "pending") {
    return (
      <Div className={`${CLS_PENDING_BOX} ${className}`}>
        <Span size="lg">⏳</Span>
        <Text className={CLS_PENDING_TITLE}>
          {bounds.isBuyRequest ? "Request Pending" : "Offer Pending"}
        </Text>
        <Text className={CLS_PENDING_BODY}>
          You already have {bounds.isBuyRequest ? "a request" : "an offer"} on this
          item. Check My Offers for updates.
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
        {bounds.isBuyRequest ? "Request to Buy" : "Make Offer"}
      </Button>
      <Modal
        isOpen={state === "open"}
        onClose={() => setState("idle")}
        size="md"
        title={bounds.isBuyRequest ? "Request to buy" : "Make an offer"}
      >
        <Form schema={schema} onSubmit={(e) => e.preventDefault()}>
          {({ setFieldError, clearErrors, markSubmitAttempted }) => (
            <Stack gap="md">
              <Text size="xs" color="muted">
                {bounds.isBuyRequest
                  ? `Listed at ${fmt(listedPrice)} · this seller is not taking lower offers`
                  : `Listed at ${fmt(listedPrice)} · Minimum offer: ${fmt(bounds.min)}`}
              </Text>

              <FieldInput
                name="offerAmount"
                type="number"
                label={bounds.isBuyRequest ? "Amount" : "Your offer amount"}
                required
                value={offerAmount}
                onChange={(value) => {
                  setOfferAmount(value);
                  clearErrors();
                }}
                min={bounds.min}
                max={bounds.max}
                step={1}
                /*
                 * One legal amount, so the field is read-only rather than an
                 * editable box that rejects every value but its default.
                 */
                readOnly={bounds.isBuyRequest}
                aria-label={bounds.isBuyRequest ? "Amount" : "Offer amount"}
              />
              {!bounds.isBuyRequest && (
                <Text size="xs" color="faint">
                  Must be between {fmt(bounds.min)} and {fmt(bounds.max)}
                </Text>
              )}

              <FieldInput
                name="buyerNote"
                type="text"
                label="Note to seller (optional)"
                value={buyerNote}
                onChange={setBuyerNote}
                placeholder={
                  bounds.isBuyRequest
                    ? "E.g. when and where you can collect it…"
                    : "E.g. Bundle deal, long-time fan…"
                }
                maxLength={300}
                aria-label="Note to seller"
              />

              <Text size="xs" color="muted">
                {bounds.isBuyRequest
                  ? "The seller will accept or decline. Accepting reserves the item for you to check out."
                  : "The seller will accept, decline, or suggest a counter price."}
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
                  onClick={() => submit(setFieldError, clearErrors, markSubmitAttempted)}
                >
                  {isPending
                    ? "Sending…"
                    : bounds.isBuyRequest
                      ? `Send request to buy at ${fmt(Number(offerAmount) || 0)}`
                      : `Send offer of ${fmt(Number(offerAmount) || 0)}`}
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
