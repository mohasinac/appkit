"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Alert, Badge, Button, Div, Heading, LoginRequiredModal, Row, Spinner, Stack, Text } from "../../../ui";
import { isAuthError } from "../../../utils/auth-error";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import type { OfferDocument } from "../../seller/schemas";
import { normalizeError } from "../../../errors/normalize";

const CLS_COUNTER_AMOUNT = "text-sm font-semibold text-info dark:text-info";

export interface UserOffersPanelProps {
  fetchEndpoint?: string;
  onAcceptCounter: (offerId: string) => Promise<void>;
  onWithdraw: (offerId: string) => Promise<void>;
  onCheckout?: (offerId: string) => Promise<void>;
  className?: string;
}

function formatRupees(amount: number | undefined): string {
  if (amount === undefined || amount === null) return "—";
  return `₹${amount.toLocaleString("en-IN")}`;
}

function relativeTime(date: Date | string | undefined): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date as string);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function statusVariant(status: string): "default" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "pending": return "warning";
    case "accepted": return "success";
    case "declined": return "danger";
    case "countered": return "info";
    case "expired": return "default";
    case "withdrawn": return "default";
    case "paid": return "success";
    default: return "default";
  }
}

interface BuyerOfferCardProps {
  offer: OfferDocument;
  onAcceptCounter: UserOffersPanelProps["onAcceptCounter"];
  onWithdraw: UserOffersPanelProps["onWithdraw"];
  onCheckout?: UserOffersPanelProps["onCheckout"];
  onUpdate: (id: string, patch: Partial<OfferDocument>) => void;
  onNeedsLogin: () => void;
}

function BuyerOfferCard({ offer, onAcceptCounter, onWithdraw, onCheckout, onUpdate, onNeedsLogin }: BuyerOfferCardProps) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<"withdraw" | null>(null);

  function act(fn: () => Promise<void>, patch: Partial<OfferDocument>) {
    setError("");
    startTransition(async () => {
      try {
        await fn();
        onUpdate(offer.id, patch);
        setConfirming(null);
      } catch (err: unknown) {
        void normalizeError(err);
        if (isAuthError(err)) {
          onNeedsLogin();
        } else {
          setError(err instanceof Error ? err.message : "Something went wrong.");
        }
      }
    });
  }

  return (
    <Stack surface="card" padding="sm" gap="3">
      <Row align="start" justify="between" gap="sm" wrap>
        <Div className="min-w-0">
          <Text className="truncate" color="primary" size="sm" weight="semibold">
            {offer.productTitle ?? "Unknown Product"}
          </Text>
          <Text className="mt-0.5" color="muted" size="xs">
            {relativeTime(offer.createdAt)}
          </Text>
        </Div>
        <Badge variant={statusVariant(offer.status)} size="xs" className="shrink-0 capitalize">
          {offer.status}
        </Badge>
      </Row>

      <Row wrap gap="md">
        <Div>
          <Text className="tracking-wide" color="faint" size="xs" transform="uppercase">Listed</Text>
          <Text size="sm" weight="medium" color="muted">{formatRupees(offer.listedPrice)}</Text>
        </Div>
        <Div>
          <Text className="tracking-wide" color="faint" size="xs" transform="uppercase">Your Offer</Text>
          <Text size="sm" weight="semibold" color="primary">{formatRupees(offer.offerAmount)}</Text>
        </Div>
        {offer.counterAmount != null && (
          <Div>
            <Text className="tracking-wide" color="faint" size="xs" transform="uppercase">Seller Counter</Text>
            <Text className={CLS_COUNTER_AMOUNT}>{formatRupees(offer.counterAmount)}</Text>
          </Div>
        )}
        {offer.lockedPrice != null && (
          <Div>
            <Text className="tracking-wide" color="faint" size="xs" transform="uppercase">Agreed Price</Text>
            <Text className="text-success" size="sm" weight="semibold">{formatRupees(offer.lockedPrice)}</Text>
          </Div>
        )}
      </Row>

      {offer.sellerNote && (
        <Text className="italic" color="muted" size="xs">
          Seller note: "{offer.sellerNote}"
        </Text>
      )}

      {/* Counter received — accept or withdraw */}
      {offer.status === "countered" && (
        <Stack gap="sm">
          <Text className="text-info" size="xs" weight="medium">
            Seller countered at {formatRupees(offer.counterAmount)}. Accept or withdraw your offer.
          </Text>
          <Row wrap gap="sm">
            <Button size="sm" variant="primary"
              onClick={() => act(() => onAcceptCounter(offer.id), { status: "accepted", lockedPrice: offer.counterAmount })}
              disabled={isPending}>
              {isPending ? "Accepting…" : `Accept ${formatRupees(offer.counterAmount)}`}
            </Button>
            <Button size="sm" variant="ghost"
              onClick={() => setConfirming("withdraw")}
              disabled={isPending}
              className="text-error border border-error/20">
              Withdraw
            </Button>
          </Row>
        </Stack>
      )}

      {/* Accepted — checkout CTA */}
      {offer.status === "accepted" && onCheckout && (
        <Button size="sm" variant="primary"
          onClick={() => act(() => onCheckout(offer.id), { status: "paid" })}
          disabled={isPending}>
          {isPending ? "Processing…" : "Checkout at Agreed Price"}
        </Button>
      )}

      {/* Pending — can withdraw */}
      {offer.status === "pending" && (
        <Button size="sm" variant="ghost"
          onClick={() => setConfirming("withdraw")}
          disabled={isPending}
          className="text-error border border-error/20 text-xs">
          Withdraw Offer
        </Button>
      )}

      {/* Withdraw confirmation */}
      {confirming === "withdraw" && (
        <Row gap="sm" >
          <Button size="sm" variant="ghost"
            onClick={() => act(() => onWithdraw(offer.id), { status: "withdrawn" })}
            disabled={isPending}
            className="text-error border border-error/20">
            {isPending ? "Withdrawing…" : "Confirm Withdraw"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(null)} disabled={isPending}>Cancel</Button>
        </Row>
      )}

      {error && <Alert variant="error"><Text size="xs">{error}</Text></Alert>}
    </Stack>
  );
}

export function UserOffersPanel({
  fetchEndpoint = "/api/user/offers",
  onAcceptCounter,
  onWithdraw,
  onCheckout,
  className = "",
}: UserOffersPanelProps) {
  const [offers, setOffers] = useState<OfferDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);

  const loadOffers = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const res = await fetch(fetchEndpoint);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) { setShowLoginModal(true); return; }
        throw new Error(`Error ${res.status}`);
      }
      const json = (await res.json()) as { items?: OfferDocument[] } | OfferDocument[];
      const items = Array.isArray(json) ? json : ((json as { items?: OfferDocument[] }).items ?? []);
      setOffers(items);
    } catch (err) {
      void normalizeError(err);
      setFetchError(err instanceof Error ? err.message : "Failed to load offers.");
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint]);

  useEffect(() => { void loadOffers(); }, [loadOffers]);

  function handleUpdate(id: string, patch: Partial<OfferDocument>) {
    setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  return (
    <Stack className={`${className}`} gap="md">
      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="You need to be signed in to manage your offers. Please log in or create an account to continue."
      />
      <Row align="center" justify="between">
        <Heading level={2} size="lg" weight="semibold" color="primary">
          My Offers
        </Heading>
        <Button size="sm" variant="ghost" onClick={loadOffers} disabled={loading}
          border="strong" textSize="xs">
          {loading ? "Refreshing…" : ACTIONS.USER["refresh-offers"].label}
        </Button>
      </Row>

      {fetchError && <Alert variant="error"><Text size="sm">{fetchError}</Text></Alert>}

      {loading && (
        <Row justify="center" padding="y-3xl">
          <Spinner size="lg" />
        </Row>
      )}

      {!loading && offers.length === 0 && (
        <Div className="text-center" padding="y-3xl">
          <Text size="sm" color="faint">No offers yet</Text>
        </Div>
      )}

      {!loading && offers.length > 0 && (
        <Stack gap="3">
          {offers.map((offer) => (
            <BuyerOfferCard
              key={offer.id}
              offer={offer}
              onAcceptCounter={onAcceptCounter}
              onWithdraw={onWithdraw}
              onCheckout={onCheckout}
              onUpdate={handleUpdate}
              onNeedsLogin={() => setShowLoginModal(true)}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
