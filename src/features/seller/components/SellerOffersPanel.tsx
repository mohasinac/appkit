"use client";

import React, { useCallback, useEffect, useState, useTransition } from "react";
import { Alert, Badge, Button, Div, Heading, Input, LoginRequiredModal, Spinner, Text } from "../../../ui";
import { isAuthError } from "../../../utils/auth-error";
import type { OfferDocument } from "../schemas";

export type SellerOfferAction =
  | { action: "accept"; offerId: string; sellerNote?: string }
  | { action: "decline"; offerId: string; sellerNote?: string }
  | { action: "counter"; offerId: string; counterAmount: number; sellerNote?: string };

export interface SellerOffersPanelProps {
  fetchEndpoint?: string;
  onRespond: (input: SellerOfferAction) => Promise<void>;
  className?: string;
}

type OfferState = "idle" | "accepting" | "declining" | "countering";

interface OfferRow extends OfferDocument {
  _uiState?: OfferState;
  _error?: string;
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

function expiresIn(expiresAt: Date | string | undefined): string {
  if (!expiresAt) return "";
  const exp = expiresAt instanceof Date ? expiresAt : new Date(expiresAt as string);
  const diff = exp.getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 1) return "< 1h left";
  if (hrs < 24) return `${hrs}h left`;
  return `${Math.floor(diff / 86_400_000)}d left`;
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

interface OfferCardProps {
  offer: OfferRow;
  onRespond: SellerOffersPanelProps["onRespond"];
  onUpdate: (id: string, patch: Partial<OfferRow>) => void;
  onNeedsLogin: () => void;
}

const PLACEHOLDER_SELLER_NOTE = "Optional note to buyer";

function OfferCard({ offer, onRespond, onUpdate, onNeedsLogin }: OfferCardProps) {
  const [uiState, setUiState] = useState<OfferState>("idle");
  const [counterInput, setCounterInput] = useState("");
  const [sellerNote, setSellerNote] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const toAccepting = useCallback(() => setUiState("accepting"), []);
  const toCountering = useCallback(() => setUiState("countering"), []);
  const toDeclining = useCallback(() => setUiState("declining"), []);
  const toIdle = useCallback(() => setUiState("idle"), []);

  const isPendingOffer = offer.status === "pending";

  function submit(action: SellerOfferAction) {
    setError("");
    startTransition(async () => {
      try {
        await onRespond(action);
        onUpdate(offer.id, {
          status:
            action.action === "accept"
              ? "accepted"
              : action.action === "decline"
                ? "declined"
                : "countered",
        });
        setUiState("idle");
      } catch (err: unknown) {
        if (isAuthError(err)) {
          onNeedsLogin();
        } else {
          setError(err instanceof Error ? err.message : "Something went wrong.");
        }
      }
    });
  }

  function handleAccept() {
    submit({ action: "accept", offerId: offer.id, sellerNote: sellerNote || undefined });
  }

  function handleDecline() {
    submit({ action: "decline", offerId: offer.id, sellerNote: sellerNote || undefined });
  }

  function handleCounter() {
    const amount = parseInt(counterInput, 10);
    if (!amount || amount <= 0) { setError("Enter a valid counter amount."); return; }
    if (amount >= offer.listedPrice) { setError("Counter must be below the listed price."); return; }
    if (amount === offer.offerAmount) { setError("Counter must differ from the buyer's offer."); return; }
    submit({ action: "counter", offerId: offer.id, counterAmount: amount, sellerNote: sellerNote || undefined });
  }

  return (
    <Div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 space-y-3">
      {/* Header row */}
      <Div className="flex items-start justify-between gap-2 flex-wrap">
        <Div className="min-w-0">
          <Text className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
            {offer.productTitle ?? "Unknown Product"}
          </Text>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {relativeTime(offer.createdAt)} · {isPendingOffer ? expiresIn(offer.expiresAt) : ""}
          </Text>
        </Div>
        <Badge variant={statusVariant(offer.status)} className="shrink-0 capitalize text-xs">
          {offer.status}
        </Badge>
      </Div>

      {/* Amounts */}
      <Div className="flex gap-4 flex-wrap">
        <Div>
          <Text className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Listed</Text>
          <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{formatRupees(offer.listedPrice)}</Text>
        </Div>
        <Div>
          <Text className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Offered</Text>
          <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{formatRupees(offer.offerAmount)}</Text>
        </Div>
        {offer.counterAmount != null && (
          <Div>
            <Text className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Your Counter</Text>
            <Text className="text-sm font-medium text-blue-600 dark:text-blue-400">{formatRupees(offer.counterAmount)}</Text>
          </Div>
        )}
      </Div>

      {offer.buyerNote && (
        <Text className="text-xs text-zinc-500 dark:text-zinc-400 italic">
          "{offer.buyerNote}"
        </Text>
      )}

      {/* Actions */}
      {isPendingOffer && uiState === "idle" && (
        <Div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="primary" onClick={toAccepting} disabled={isPending}>Accept</Button>
          <Button size="sm" variant="ghost" onClick={toCountering} disabled={isPending}
            className="border border-zinc-300 dark:border-zinc-600">Counter</Button>
          <Button size="sm" variant="ghost" onClick={toDeclining} disabled={isPending}
            className="text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">Decline</Button>
        </Div>
      )}

      {/* Accept confirmation */}
      {uiState === "accepting" && (
        <Div className="space-y-2">
          <Input
            placeholder={PLACEHOLDER_SELLER_NOTE}
            value={sellerNote}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSellerNote(e.target.value)}
            disabled={isPending}
          />
          <Div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={handleAccept} disabled={isPending}>
              {isPending ? "Accepting…" : "Confirm Accept"}
            </Button>
            <Button size="sm" variant="ghost" onClick={toIdle} disabled={isPending}>Cancel</Button>
          </Div>
        </Div>
      )}

      {/* Decline confirmation */}
      {uiState === "declining" && (
        <Div className="space-y-2">
          <Input
            placeholder={PLACEHOLDER_SELLER_NOTE}
            value={sellerNote}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSellerNote(e.target.value)}
            disabled={isPending}
          />
          <Div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={handleDecline} disabled={isPending}
              className="text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
              {isPending ? "Declining…" : "Confirm Decline"}
            </Button>
            <Button size="sm" variant="ghost" onClick={toIdle} disabled={isPending}>Cancel</Button>
          </Div>
        </Div>
      )}

      {/* Counter form */}
      {uiState === "countering" && (
        <Div className="space-y-2">
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">
            Suggest a price between the buyer's offer ({formatRupees(offer.offerAmount)}) and your listed price ({formatRupees(offer.listedPrice)}).
          </Text>
          <Input
            type="number"
            placeholder="Your counter amount (₹)"
            value={counterInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCounterInput(e.target.value)}
            disabled={isPending}
          />
          <Input
            placeholder={PLACEHOLDER_SELLER_NOTE}
            value={sellerNote}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSellerNote(e.target.value)}
            disabled={isPending}
          />
          <Div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={handleCounter} disabled={isPending}>
              {isPending ? "Sending…" : "Send Counter"}
            </Button>
            <Button size="sm" variant="ghost" onClick={toIdle} disabled={isPending}>Cancel</Button>
          </Div>
        </Div>
      )}

      {error && <Alert variant="error"><Text className="text-xs">{error}</Text></Alert>}
    </Div>
  );
}

export function SellerOffersPanel({
  fetchEndpoint = "/api/store/offers",
  onRespond,
  className = "",
}: SellerOffersPanelProps) {
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const loadOffers = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const url = statusFilter === "all"
        ? fetchEndpoint
        : `${fetchEndpoint}?status=${statusFilter}`;
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) { setShowLoginModal(true); return; }
        throw new Error(`Error ${res.status}`);
      }
      const json = (await res.json()) as { items?: OfferRow[]; offers?: OfferRow[] };
      setOffers(json.items ?? json.offers ?? []);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load offers.");
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint, statusFilter]);

  useEffect(() => { void loadOffers(); }, [loadOffers]);

  function handleUpdate(id: string, patch: Partial<OfferRow>) {
    setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  const STATUS_FILTERS = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "countered", label: "Countered" },
    { value: "accepted", label: "Accepted" },
    { value: "declined", label: "Declined" },
    { value: "expired", label: "Expired" },
  ];

  const pending = offers.filter((o) => o.status === "pending").length;

  return (
    <Div className={`space-y-4 ${className}`}>
      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="You need to be signed in to manage offers. Please log in or create an account to continue."
      />
      <Div className="flex items-center justify-between flex-wrap gap-2">
        <Div>
          <Heading level={2} className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Offers Received
          </Heading>
          {pending > 0 && (
            <Text className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              {pending} pending offer{pending > 1 ? "s" : ""} awaiting your response
            </Text>
          )}
        </Div>
        <Button size="sm" variant="ghost" onClick={loadOffers} disabled={loading}
          className="border border-zinc-300 dark:border-zinc-600 text-xs">
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </Div>

      {/* Filter tabs */}
      <Div className="flex gap-1 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={statusFilter === f.value ? "primary" : "ghost"}
            onClick={() => setStatusFilter(f.value)}
            className="text-xs px-2 py-1"
          >
            {f.label}
          </Button>
        ))}
      </Div>

      {fetchError && <Alert variant="error"><Text className="text-sm">{fetchError}</Text></Alert>}

      {loading && (
        <Div className="flex justify-center py-12">
          <Spinner size="lg" />
        </Div>
      )}

      {!loading && offers.length === 0 && (
        <Div className="text-center py-12">
          <Text className="text-zinc-400 dark:text-zinc-500 text-sm">No offers found</Text>
        </Div>
      )}

      {!loading && offers.length > 0 && (
        <Div className="space-y-3">
          {offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} onRespond={onRespond} onUpdate={handleUpdate} onNeedsLogin={() => setShowLoginModal(true)} />
          ))}
        </Div>
      )}
    </Div>
  );
}
