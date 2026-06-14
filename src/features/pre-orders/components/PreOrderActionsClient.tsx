"use client";

import React, { useState, useTransition } from "react";
import { Button, Div, LoginRequiredModal, Span, Stack, Text } from "../../../ui";
import { isAuthError } from "../../../utils/auth-error";
import { formatCurrency } from "../../../utils/number.formatter";
import { normalizeError } from "../../../errors/normalize";

export interface PreOrderActionsClientProps {
  productId: string;
  price: number | null;
  currency: string;
  depositAmount: number | null;
  depositPercent: number | null;
  isCancellable: boolean;
  tags?: string[];
  onReserveNow: (productId: string) => Promise<void>;
}

export function PreOrderActionsClient({
  productId,
  price,
  currency,
  depositAmount,
  depositPercent,
  isCancellable,
  tags = [],
  onReserveNow,
}: PreOrderActionsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  function handleReserve() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        await onReserveNow(productId);
        setSuccess(true);
      } catch (err: unknown) {
        void normalizeError(err);
        if (isAuthError(err)) {
          setShowLoginModal(true);
        } else {
          setError(err instanceof Error ? err.message : "Failed to reserve. Please try again.");
        }
      }
    });
  }

  return (
    <Div className="space-y-4">
      {price !== null && (
        <Div>
          <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {formatCurrency(price, currency)}
          </Text>
          {depositAmount !== null && (
            <Text className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Reserve with {formatCurrency(depositAmount, currency)}{depositPercent !== null ? ` (${depositPercent}% deposit)` : ""}
            </Text>
          )}
        </Div>
      )}

      {error && (
        <Text className="text-xs text-error">{error}</Text>
      )}
      {success && (
        <Text className="text-xs text-success">
          ✓ Reserved! Redirecting to checkout…
        </Text>
      )}

      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="You need to be signed in to reserve this pre-order. Please log in or create an account to continue."
      />

      <Stack gap="sm">
        <Button
          variant="primary"
          size="md"
          className="w-full"
          disabled={isPending}
          onClick={handleReserve}
        >
          {isPending ? "Processing…" : "Reserve Now"}
        </Button>
        {isCancellable && (
          <Text className="text-center text-xs text-zinc-500 dark:text-zinc-400">
            ✓ Free cancellation before production
          </Text>
        )}
      </Stack>

      {tags.length > 0 && (
        <Div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
          <Div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Span key={tag} size="xs" className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-zinc-600 dark:text-zinc-300">
                {tag}
              </Span>
            ))}
          </Div>
        </Div>
      )}

      <Div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
        <Div className="flex flex-wrap gap-4 justify-center text-center">
          {[
            { icon: "🔒", label: "Secure\nPayment" },
            { icon: "📅", label: "Guaranteed\nDelivery" },
            { icon: "↩", label: "Free\nCancellation" },
          ].map(({ icon, label }) => (
            <Div key={label} className="flex flex-col items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 min-w-[60px]">
              <Span size="base">{icon}</Span>
              <Span className="whitespace-pre-line leading-tight">{label}</Span>
            </Div>
          ))}
        </Div>
      </Div>
    </Div>
  );
}
