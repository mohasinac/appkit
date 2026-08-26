"use client";

/**
 * CartGroupLineRow — one cart line that stands for several products.
 *
 * Two shapes behind one component, because the difference is exactly the
 * bundle-vs-group distinction and putting them in separate files would let it
 * drift:
 *
 *   BUNDLE — all-or-nothing. Members render read-only; the only stepper is the
 *            line's own and it means COPIES OF THE BUNDLE.
 *   GROUP  — pick-as-you-wish. One stepper PER MEMBER, and no line-level
 *            stepper at all (a group line's `quantity` is pinned to 1, so a
 *            second multiplier would double-count).
 *
 * Never render both steppers. That is the invariant on `CartLineMember`
 * expressed in UI.
 */

import React, { useState } from "react";
import { Button, Div, Row, Span, Stack, Text, TextLink } from "../../../ui";
import { QuantityStepper } from "../../../ui/components/QuantityStepper";
import { MediaImage } from "../../media/MediaImage";
import { formatCurrency } from "../../../utils/number.formatter";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import type { CartLineMember } from "../schemas";

const __O = { hidden: "overflow-hidden" } as const;

export interface CartGroupLineRowProps {
  /** Line identity (`CartItemDocument.itemId`). */
  id: string;
  title: string;
  image?: string;
  currency?: string;
  /** `"bundle"` → copies stepper; `"group"` → per-member steppers. */
  lineKind: "bundle" | "group";
  members: CartLineMember[];
  /** Copies of the whole line. Bundles only — a group line is always 1. */
  quantity: number;
  /** Detail href for the bundle / group itself. */
  href?: string;
  locked?: boolean;
  /** Bundle only: change the number of copies. */
  onQtyChange?: (id: string, qty: number) => void;
  /** Group only: change one member's per-copy quantity (0 removes it). */
  onMemberQtyChange?: (id: string, productId: string, qty: number) => void;
  onRemove?: (id: string) => void;
  /** Per-member stock ceiling, keyed by productId. */
  maxByProductId?: Record<string, number>;
  variant?: "card" | "row";
}

export function CartGroupLineRow({
  id,
  title,
  image,
  currency = "INR",
  lineKind,
  members,
  quantity,
  href,
  locked = false,
  onQtyChange,
  onMemberQtyChange,
  onRemove,
  maxByProductId,
  variant = "card",
}: CartGroupLineRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isRow = variant === "row";

  const onePrice = members.reduce((sum, m) => sum + m.unitPrice * m.quantity, 0);
  const lineTotal = onePrice * quantity;
  const unitCount = members.reduce((sum, m) => sum + m.quantity, 0);

  return (
    <Div
      layout="flex"
      gap={isRow ? "3" : "4"}
      surface={isRow ? "none" : "card"}
      padding={isRow ? "none" : "sm"}
      className="min-w-0"
    >
      <Div
        surface="muted"
        className={`relative ${isRow ? "h-16 w-16" : "h-20 w-20"} flex-shrink-0 ${__O.hidden}`}
        rounded="lg"
      >
        {image && <MediaImage src={image} alt={title} size="thumbnail" />}
      </Div>

      <Stack justify="between" gap="xs" className="flex-1 min-w-0">
        <Row gap="xs" align="start" className="min-w-0">
          {href ? (
            <TextLink
              href={href}
              weight="medium"
              className="text-[var(--appkit-color-text)] hover:underline underline-offset-2 line-clamp-2"
            >
              {title}
            </TextLink>
          ) : (
            <Text truncate={2} weight="medium" color="primary">{title}</Text>
          )}
          <Span
            padding="pill-2xs"
            surface="subtle"
            color="muted"
            rounded="default"
            className="flex-shrink-0 text-[10px] tracking-wide"
            transform="uppercase"
          >
            {lineKind === "bundle" ? "Bundle" : "Group"}
          </Span>
        </Row>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen((v) => !v)}
          aria-expanded={isOpen}
          className="self-start text-[length:var(--appkit-text-xs)] text-[var(--appkit-color-primary)] hover:underline"
        >
          {isOpen ? "▼" : "▶"} {members.length} item{members.length === 1 ? "" : "s"}
          {unitCount !== members.length ? ` · ${unitCount} units` : ""}
        </Button>

        {isOpen && (
          <Stack gap="xs" className="w-full">
            {members.map((m) => (
              <Row key={m.productId} gap="sm" align="center" justify="between" className="min-w-0">
                <Row gap="sm" align="center" className="min-w-0 flex-1">
                  <Div className={`h-10 w-10 flex-shrink-0 ${__O.hidden}`} rounded="default" surface="muted">
                    {m.image && <MediaImage src={m.image} alt={m.title} size="thumbnail" />}
                  </Div>
                  <Stack gap="none" className="min-w-0">
                    <Text size="sm" truncate={1} color="primary">{m.title}</Text>
                    <Text size="xs" color="muted">
                      {formatCurrency(m.unitPrice, currency)}
                      {lineKind === "bundle" ? ` × ${m.quantity}` : ""}
                    </Text>
                  </Stack>
                </Row>

                {/* Per-member steppers exist ONLY for a group line. A bundle is
                    all-or-nothing, so its member quantities are fixed. */}
                {lineKind === "group" && onMemberQtyChange && !locked && (
                  <Row gap="xs" align="center" className="flex-shrink-0">
                    <QuantityStepper
                      value={m.quantity}
                      onChange={(next) => onMemberQtyChange(id, m.productId, next)}
                      min={0}
                      max={maxByProductId?.[m.productId]}
                      ariaLabel={`Quantity for ${m.title}`}
                      decrementLabel={ACTIONS.CART["decrease-quantity"].ariaLabel}
                      incrementLabel={ACTIONS.CART["increase-quantity"].ariaLabel}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={ACTIONS.CART["remove-group-member"].ariaLabel}
                      onClick={() => onMemberQtyChange(id, m.productId, 0)}
                      className="text-[var(--appkit-color-text-faint)] transition hover:text-error"
                    >
                      ✕
                    </Button>
                  </Row>
                )}
                {lineKind === "bundle" && (
                  <Span size="xs" color="muted" className="flex-shrink-0">× {m.quantity}</Span>
                )}
              </Row>
            ))}
          </Stack>
        )}

        <Row justify="between" gap="sm" className="min-w-0">
          <Text weight="semibold" className="text-[var(--appkit-color-text)]">
            {formatCurrency(lineTotal, currency)}
          </Text>
          {/* Copies stepper — bundles only, for the reason above. */}
          {lineKind === "bundle" && onQtyChange && !locked && (
            <QuantityStepper
              value={quantity}
              onChange={(next) => onQtyChange(id, next)}
              min={1}
              ariaLabel={`Number of copies of ${title}`}
              decrementLabel={ACTIONS.CART["decrease-quantity"].ariaLabel}
              incrementLabel={ACTIONS.CART["increase-quantity"].ariaLabel}
            />
          )}
        </Row>
      </Stack>

      {onRemove && !locked && (
        <Button
          onClick={() => onRemove(id)}
          variant="ghost"
          size="sm"
          aria-label={ACTIONS.CART["remove-item"].ariaLabel}
          className="self-start text-[var(--appkit-color-text-faint)] transition hover:text-error"
        >
          ✕
        </Button>
      )}
    </Div>
  );
}
