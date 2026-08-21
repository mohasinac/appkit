"use client";

import React from "react";
import { Gift, MessageCircle, ShieldCheck, Tag } from "lucide-react";
import { Row, Span, Stack, Text } from "../../../ui";
import { formatCurrency } from "../../../utils/number.formatter";

/**
 * Icon badges for an order's paid add-ons and applied coupon.
 *
 * These are fulfilment instructions, not decoration: WhatsApp tells the
 * status-change notifier to message this buyer, gift wrap tells the packer to
 * wrap the parcel and enclose the message, shipment protection changes how a
 * loss claim is handled. They are recorded on the order (and filterable in the
 * `orders` Sieve config) so nobody has to keep a separate list of who asked for
 * what — the order IS the record.
 *
 * Rendered on every order surface — buyer detail, seller list + detail, admin
 * list + detail — from one implementation, so a new add-on shows up everywhere
 * at once instead of being wired per screen.
 */

export interface OrderAddonBadgesOrder {
  whatsappNotifyAddon?: boolean;
  whatsappNotifyFee?: number;
  giftWrapAddon?: boolean;
  giftWrapFee?: number;
  giftWrapMessage?: string;
  shipmentProtectionAddon?: boolean;
  shipmentProtectionFee?: number;
  couponCode?: string;
  couponDiscount?: number;
}

export interface OrderAddonBadgesProps {
  order: OrderAddonBadgesOrder;
  /** `"compact"` — icon chips only, for list rows. `"detail"` — chips + the gift message and fees. */
  variant?: "compact" | "detail";
  /** Hide the coupon chip where the coupon is already shown in a price breakdown. */
  showCoupon?: boolean;
  currency?: string;
  className?: string;
}

const CHIP_BASE =
  "inline-flex items-center gap-[var(--appkit-space-1)] rounded-full px-[var(--appkit-space-2)] py-[var(--appkit-space-0-5)] text-[length:var(--appkit-text-xs)] font-medium";

function Chip({
  icon,
  label,
  tone,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "brand" | "success" | "info";
  title?: string;
}) {
  const toneCls =
    tone === "success"
      ? "bg-success-surface text-success"
      : tone === "info"
        ? "bg-info-surface text-info"
        : "bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300";
  return (
    <Span className={`${CHIP_BASE} ${toneCls}`} title={title}>
      <Span className="flex-shrink-0" aria-hidden="true">{icon}</Span>
      {label}
    </Span>
  );
}

export function OrderAddonBadges({
  order,
  variant = "compact",
  showCoupon = true,
  currency = "INR",
  className = "",
}: OrderAddonBadgesProps) {
  const money = (v?: number) => (typeof v === "number" && v > 0 ? formatCurrency(v, currency) : undefined);

  const hasCoupon = showCoupon && !!order.couponCode;
  const hasAny =
    order.whatsappNotifyAddon ||
    order.giftWrapAddon ||
    order.shipmentProtectionAddon ||
    hasCoupon;
  if (!hasAny) return null;

  const isDetail = variant === "detail";

  return (
    <Stack gap="xs" className={`min-w-0 ${className}`}>
      <Row gap="xs" align="center" wrap className="min-w-0">
        {order.whatsappNotifyAddon && (
          <Chip
            icon={<MessageCircle size={12} />}
            label={isDetail && money(order.whatsappNotifyFee) ? `WhatsApp updates · ${money(order.whatsappNotifyFee)}` : "WhatsApp updates"}
            tone="success"
            title="Buyer opted into WhatsApp order-status updates — status changes on this order should notify them on WhatsApp."
          />
        )}
        {order.giftWrapAddon && (
          <Chip
            icon={<Gift size={12} />}
            label={isDetail && money(order.giftWrapFee) ? `Gift wrap · ${money(order.giftWrapFee)}` : "Gift wrap"}
            tone="brand"
            title="This parcel must be gift-wrapped before dispatch."
          />
        )}
        {order.shipmentProtectionAddon && (
          <Chip
            icon={<ShieldCheck size={12} />}
            label={isDetail && money(order.shipmentProtectionFee) ? `Protected · ${money(order.shipmentProtectionFee)}` : "Protected"}
            tone="info"
            title="Shipment protection purchased — loss or damage in transit is covered."
          />
        )}
        {hasCoupon && (
          <Chip
            icon={<Tag size={12} />}
            label={
              isDetail && money(order.couponDiscount)
                ? `${order.couponCode} · −${money(order.couponDiscount)}`
                : (order.couponCode as string)
            }
            tone="success"
            title={`Coupon ${order.couponCode} applied to this order.`}
          />
        )}
      </Row>

      {/* The packer physically needs this text, so it can't stay behind a
          tooltip — it renders in full on any detail surface. */}
      {isDetail && order.giftWrapAddon && order.giftWrapMessage && (
        <Stack gap="xs" className="min-w-0">
          <Text size="xs" color="muted" weight="semibold" transform="uppercase" className="tracking-wide">
            Gift message
          </Text>
          <Text size="sm" color="primary" className="min-w-0 whitespace-pre-wrap break-words">
            {order.giftWrapMessage}
          </Text>
        </Stack>
      )}
    </Stack>
  );
}
