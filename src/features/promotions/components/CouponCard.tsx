"use client";

import { useState } from "react";
import { Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { BaseListingCard, ConfirmDeleteModal, Div, Row, Span, Text } from "../../../ui";
import type { CouponItem, CouponType } from "../types";
import { useLongPress } from "../../../react/hooks/useLongPress";

const TYPE_COLORS: Record<CouponType, { card: string; code: string }> = {
  percentage:   { card: "bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800", code: "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700" },
  fixed:        { card: "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",   code: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700" },
  free_shipping:{ card: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",      code: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700" },
  buy_x_get_y:  { card: "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800", code: "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700" },
};

/**
 * Two coupon shapes coexist in this codebase:
 * - flat `CouponItem`     (older client type — `discountValue`, `expiresAt`, `isActive`)
 * - nested `CouponDocument` (Firestore canonical — `discount.value`, `validity.endDate`, `validity.isActive`, `usage.currentUsage`)
 *
 * API endpoints return the nested shape; this card accepts either and normalizes.
 */
type CouponLike = Record<string, unknown>;

interface Normalized {
  id: string;
  code: string;
  name: string;
  description: string;
  type: CouponType;
  scope?: "admin" | "seller";
  storeId?: string;
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  expiresAt?: string | Date;
  startsAt?: string | Date;
  isActive: boolean;
  usageCount: number;
  usageLimit?: number;
}

function pick<T = unknown>(obj: CouponLike, ...keys: string[]): T | undefined {
  for (const k of keys) {
    const parts = k.split(".");
    let cur: unknown = obj;
    for (const p of parts) {
      if (cur && typeof cur === "object") cur = (cur as Record<string, unknown>)[p];
      else { cur = undefined; break; }
    }
    if (cur !== undefined && cur !== null) return cur as T;
  }
  return undefined;
}

function normalize(coupon: CouponLike): Normalized {
  return {
    id:          String(pick(coupon, "id") ?? ""),
    code:        String(pick(coupon, "code") ?? ""),
    name:        String(pick(coupon, "name") ?? ""),
    description: String(pick(coupon, "description") ?? ""),
    type:        (pick(coupon, "type") as CouponType) ?? "percentage",
    scope:       pick(coupon, "scope") as "admin" | "seller" | undefined,
    storeId:     pick(coupon, "storeId"),
    discountValue:     Number(pick(coupon, "discount.value", "discountValue") ?? 0),
    minOrderAmount:    pick(coupon, "discount.minPurchase", "minOrderAmount") as number | undefined,
    maxDiscountAmount: pick(coupon, "discount.maxDiscount", "maxDiscountAmount") as number | undefined,
    expiresAt:   pick(coupon, "validity.endDate", "expiresAt") as string | Date | undefined,
    startsAt:    pick(coupon, "validity.startDate", "startsAt") as string | Date | undefined,
    isActive:    Boolean(pick(coupon, "validity.isActive", "isActive") ?? false),
    usageCount:  Number(pick(coupon, "usage.currentUsage", "usageCount") ?? 0),
    usageLimit:  pick(coupon, "usage.totalLimit", "maxUsageCount") as number | undefined,
  };
}

function formatDateSafe(value: string | Date | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString();
}

function formatDiscount(n: Normalized, labels: Required<CouponCardLabels>): string {
  if (n.type === "percentage") return `${n.discountValue}% ${labels.off}`;
  if (n.type === "fixed") return `₹${(n.discountValue / 100).toFixed(0)} ${labels.off}`;
  if (n.type === "free_shipping") return labels.freeShipping;
  if (n.type === "buy_x_get_y") return `BOGO`;
  return `${n.discountValue} ${labels.off}`;
}

export interface CouponCardLabels {
  copy?: string;
  copied?: string;
  claim?: string;
  claiming?: string;
  claimed?: string;
  expires?: string;
  minOrder?: string;
  off?: string;
  freeShipping?: string;
  active?: string;
  inactive?: string;
  used?: string;
  edit?: string;
  activate?: string;
  deactivate?: string;
  delete?: string;
  deleteConfirm?: string;
}

const DEFAULT_LABELS: Required<CouponCardLabels> = {
  copy: "Copy",
  copied: "Copied!",
  claim: "Claim",
  claiming: "Claiming…",
  claimed: "Use →",
  expires: "Expires",
  minOrder: "Min order",
  off: "OFF",
  freeShipping: "Free Shipping",
  active: "Active",
  inactive: "Inactive",
  used: "used",
  edit: "Edit",
  activate: "Activate",
  deactivate: "Deactivate",
  delete: "Delete",
  deleteConfirm: "Delete this coupon? This cannot be undone.",
};

interface CouponCardProps {
  /** Accepts either `CouponItem` (flat) or `CouponDocument` (nested). */
  coupon: CouponItem | Record<string, unknown>;
  labels?: CouponCardLabels;
  onCopy?: (code: string) => void;
  className?: string;
  /** Bulk-selection */
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  /** Admin/seller CRUD actions — when any is provided, the action bar is rendered. */
  onEdit?: (id: string) => void;
  onToggleActive?: (id: string, currentlyActive: boolean) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
  /**
   * Hide the public Claim CTA. Defaults to false. Set true on admin/CRUD
   * surfaces where the user is managing coupons, not redeeming them.
   */
  hideClaim?: boolean;
  /** Source enum forwarded to /api/user/coupons/claim for analytics. */
  claimSource?: "manual" | "promo" | "spin" | "raffle" | "prize-draw";
}

export function CouponCard({
  coupon,
  labels: labelsProp,
  onCopy,
  className = "",
  selectable = false,
  isSelected = false,
  onSelect,
  onEdit,
  onToggleActive,
  onDelete,
  hideClaim,
  claimSource = "manual",
}: CouponCardProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const n = normalize(coupon as CouponLike);
  const colors = TYPE_COLORS[n.type] ?? TYPE_COLORS.percentage;

  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [busy, setBusy] = useState<"toggle" | "delete" | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const longPress = useLongPress(() => onSelect?.(n.id, !isSelected));

  const expiry = formatDateSafe(n.expiresAt);
  const discountLabel = formatDiscount(n, labels);
  const hasAdminActions = Boolean(onEdit || onToggleActive || onDelete);
  // Show Claim by default on public surfaces; hide automatically when this
  // card is being rendered with admin/CRUD actions wired.
  const showClaim = hideClaim === undefined ? !hasAdminActions : !hideClaim;

  const handleCopy = () => {
    if (!n.code) return;
    navigator.clipboard.writeText(n.code).catch(() => {});
    setCopied(true);
    onCopy?.(n.code);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClaim = async () => {
    if (!n.code || claiming) return;
    setClaiming(true);
    try {
      // Best-effort: claim into the wallet (anon users get 401, which we
      // ignore so the deep-link still works), then jump to cart with the
      // code pre-filled.
      try {
        await fetch("/api/user/coupons/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ couponCode: n.code, source: claimSource }),
        });
      } catch {
        /* anon/network — non-fatal */
      }
      if (typeof window !== "undefined") {
        window.location.href = `/cart?coupon=${encodeURIComponent(n.code)}`;
      }
    } finally {
      setClaiming(false);
    }
  };

  const handleToggle = async () => {
    if (!onToggleActive) return;
    setBusy("toggle");
    try { await onToggleActive(n.id, n.isActive); }
    finally { setBusy(null); }
  };

  const handleDeleteConfirmed = async () => {
    if (!onDelete) return;
    setDeleteConfirmOpen(false);
    setBusy("delete");
    try { await onDelete(n.id); }
    finally { setBusy(null); }
  };

  return (
    <Div
      className={`group relative flex h-full flex-col rounded-xl border-2 p-4 ${colors.card} ${isSelected ? "ring-2 ring-primary" : ""} ${!n.isActive ? "opacity-70" : ""} ${className}`}
      onMouseDown={onSelect && !isSelected ? longPress.onMouseDown : undefined}
      onMouseUp={onSelect && !isSelected ? longPress.onMouseUp : undefined}
      onMouseLeave={onSelect && !isSelected ? longPress.onMouseLeave : undefined}
      onTouchStart={onSelect && !isSelected ? longPress.onTouchStart : undefined}
      onTouchEnd={onSelect && !isSelected ? longPress.onTouchEnd : undefined}
    >
      {onSelect && (
        <BaseListingCard.Checkbox
          selected={isSelected}
          onSelect={(e) => { e.preventDefault(); onSelect(n.id, !isSelected); }}
          label={isSelected ? "Deselect coupon" : "Select coupon"}
          position="top-2 right-2"
          className={selectable || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity"}
        />
      )}

      {/* Status + scope pills (CRUD context) */}
      {(hasAdminActions || n.scope) && (
        <Row gap="xs" className="mb-2 flex-wrap">
          <Span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              n.isActive
                ? "bg-success-surface text-success"
                : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
            }`}
          >
            {n.isActive ? labels.active : labels.inactive}
          </Span>
          {n.scope && (
            <Span className="inline-flex items-center rounded-full bg-zinc-200/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700 dark:bg-zinc-700/60 dark:text-zinc-200">
              {n.scope}
            </Span>
          )}
        </Row>
      )}

      {/* Discount label + name */}
      <Div className="mb-3">
        <Text className="text-2xl font-extrabold tracking-tight leading-none">
          {discountLabel}
        </Text>
        {n.name && (
          <Text className="text-sm mt-0.5 font-medium opacity-80">{n.name}</Text>
        )}
      </Div>

      {n.description && (
        <Text className="text-xs opacity-60 mb-3">{n.description}</Text>
      )}

      {/* Copy code block + Claim CTA (public surfaces). On admin/CRUD surfaces
          the Claim button is hidden via `hideClaim` since admins aren't
          redeeming the coupons they're managing. */}
      <div className={`flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 ${colors.code}`}>
        <span className="flex-1 font-mono text-sm font-bold tracking-widest uppercase select-all">
          {n.code || "—"}
        </span>
        {n.code && (
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition-all hover:opacity-80 active:scale-95 bg-white/60 dark:bg-black/20 border border-current/20"
            aria-label="Copy coupon code"
          >
            {copied ? labels.copied : labels.copy}
          </button>
        )}
      </div>
      {showClaim && n.code && n.isActive && (
        <div className="mt-2">
          <button
            type="button"
            onClick={handleClaim}
            disabled={claiming}
            className="w-full rounded-md px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 bg-[var(--appkit-color-primary-700)] text-[var(--appkit-color-text-on-primary,#fff)] hover:bg-[var(--appkit-color-primary-800)] disabled:opacity-50"
            aria-label={`Claim coupon ${n.code} and apply at checkout`}
          >
            {claiming ? labels.claiming : labels.claim}
          </button>
        </div>
      )}

      {/* Meta row */}
      <Row wrap gap="sm" className="text-xs opacity-60 mt-2">
        {n.minOrderAmount ? (
          <Span>{labels.minOrder}: ₹{(n.minOrderAmount / 100).toFixed(0)}</Span>
        ) : null}
        {expiry && (
          <Span>{labels.expires}: {expiry}</Span>
        )}
        {n.usageLimit ? (
          <Span>{n.usageCount}/{n.usageLimit} {labels.used}</Span>
        ) : n.usageCount > 0 ? (
          <Span>{n.usageCount} {labels.used}</Span>
        ) : null}
      </Row>

      {/* Admin / seller CRUD action bar */}
      {hasAdminActions && (
        <Row gap="xs" justify="end" className="mt-auto pt-3">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(n.id)}
              title={labels.edit}
              aria-label={labels.edit}
              className="rounded-lg p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-white/60 dark:hover:bg-black/30 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {onToggleActive && (
            <button
              type="button"
              onClick={handleToggle}
              disabled={busy === "toggle"}
              title={n.isActive ? labels.deactivate : labels.activate}
              aria-label={n.isActive ? labels.deactivate : labels.activate}
              className="rounded-lg p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-white/60 dark:hover:bg-black/30 transition-colors disabled:opacity-50"
            >
              {n.isActive
                ? <ToggleRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                : <ToggleLeft className="h-4 w-4" />}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={busy === "delete"}
              title={labels.delete}
              aria-label={labels.delete}
              className="rounded-lg p-1.5 text-zinc-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </Row>
      )}
      {deleteConfirmOpen && (
        <ConfirmDeleteModal
          isOpen
          title="Delete Coupon"
          message={labels.deleteConfirm}
          onConfirm={handleDeleteConfirmed}
          onClose={() => setDeleteConfirmOpen(false)}
          isDeleting={busy === "delete"}
        />
      )}
    </Div>
  );
}
