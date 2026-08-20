import type { CartItem } from "../types";
import { Aside, Button, Div, Heading, Row, Span, Stack, Text, TextLink } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { formatCurrency } from "../../../utils/number.formatter";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";

const __P = {
  p4: "p-[var(--appkit-space-4)]",
} as const;

const __O = {
  hidden: "overflow-hidden",
  yAuto: "overflow-y-auto",
} as const;

const CLS_REMOVE_BTN = "self-start text-[var(--appkit-color-text-faint)] transition hover:text-error";

interface CartItemRowProps {
  item: CartItem;
  onQtyChange?: (id: string, qty: number) => void;
  onRemove?: (id: string) => void;
  /** Product detail URL — if provided, title becomes a link */
  href?: string;
  /** When true: grays out item, shows "Out of Stock" badge, locks qty stepper */
  isOutOfStock?: boolean;
}

export function CartItemRow({ item, onQtyChange, onRemove, href, isOutOfStock = false }: CartItemRowProps) {
  return (
    <Div layout="flex" gap="4" surface="card" padding="sm" className={`transition-opacity ${isOutOfStock ? "opacity-60" : ""}`}>
      <Div surface="muted" className={`relative h-20 w-20 flex-shrink-0 ${__O.hidden}`} rounded="lg">
        {item.meta.image && (
          <MediaImage src={item.meta.image} alt={item.meta.title} size="thumbnail" />
        )}
      </Div>
      <Stack justify="between" className="flex-1 min-w-0">
        <Row gap="xs" className="" align="start">
          {href ? (
            <TextLink
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              weight="medium"
              className="text-[var(--appkit-color-text)] hover:underline underline-offset-2 line-clamp-2"
            >
              {item.meta.title}
            </TextLink>
          ) : (
            <Text truncate={2} weight="medium" color="primary">
              {item.meta.title}
            </Text>
          )}
          {isOutOfStock && (
            <Span padding="pill-2xs" color="error" surface="danger-surface" weight="semibold" className="flex-shrink-0 text-[10px] tracking-wide" rounded="default" transform="uppercase">
              Out of Stock
            </Span>
          )}
        </Row>
        {item.meta.attributes &&
          Object.keys(item.meta.attributes).length > 0 && (
            <Text className="text-[var(--appkit-color-text-muted)]" size="xs" truncate={1}>
              {Object.entries(item.meta.attributes)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ")}
            </Text>
          )}
        <Row justify="between">
          <Text className="text-[var(--appkit-color-text)]" weight="semibold">
            {formatCurrency(
              item.meta.price * item.quantity,
              item.meta.currency,
            )}
          </Text>
          {onQtyChange && !isOutOfStock && (
            <Row gap="sm">
              <Button rounded="full" 
                onClick={() => onQtyChange(item.id, item.quantity - 1)}
                disabled={item.quantity <= 1}
                variant="outline"
                size="sm"
                className="h-7 w-7 justify-center border border-neutral-200 border-[var(--appkit-color-border)] text-[length:var(--appkit-text-sm)] disabled:opacity-40"
              >
                −
              </Button>
              <Span size="sm" className="min-w-[1.5rem]" align="center">
                {item.quantity}
              </Span>
              <Button rounded="full" 
                onClick={() => onQtyChange(item.id, item.quantity + 1)}
                variant="outline"
                size="sm"
                className="h-7 w-7 justify-center border border-neutral-200 border-[var(--appkit-color-border)] text-[length:var(--appkit-text-sm)]"
              >
                +
              </Button>
            </Row>
          )}
          {isOutOfStock && (
            <Span size="xs" color="muted">Qty: {item.quantity}</Span>
          )}
        </Row>
      </Stack>
      {onRemove && (
        <Button
          onClick={() => onRemove(item.id)}
          variant="ghost"
          size="sm"
          aria-label={ACTIONS.CART["remove-item"].ariaLabel}
          className={CLS_REMOVE_BTN}
        >
          ✕
        </Button>
      )}
    </Div>
  );
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  subtotal?: number;
  /** ISO 4217 currency code, e.g. "INR", "USD". Defaults to "INR". */
  currency?: string;
  isLoading?: boolean;
  onQtyChange?: (id: string, qty: number) => void;
  onRemove?: (id: string) => void;
  onCheckout?: () => void;
  labels?: {
    title?: string;
    empty?: string;
    checkout?: string;
    subtotal?: string;
  };
}

export function CartDrawer({
  isOpen,
  onClose,
  items,
  subtotal = 0,
  currency,
  isLoading,
  onQtyChange,
  onRemove,
  onCheckout,
  labels = {},
}: CartDrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      <Div surface="overlay-xs" 
        role="presentation"
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <Aside surface="sidePanel" shadow="xl" className="fixed inset-y-0 right-0 z-50 w-full max-w-sm">
        <Stack className="h-full">
        <Row justify="between" border="bottom" className={__P.p4}>
          <Heading level={2} size="lg" weight="semibold">
            {labels.title ?? "Cart"}
          </Heading>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            aria-label="Close cart"
            textColor="faint"
            className="hover:text-[var(--appkit-color-text)] dark:hover:text-[var(--appkit-color-text)]"
          >
            ✕
          </Button>
        </Row>
        <Stack className={`flex-1 ${__O.yAuto} ${__P.p4}`} gap="3">
          {isLoading ? (
            <Row justify="center" padding="y-3xl">
              <Div className="h-8 w-8 animate-spin border-2 border-neutral-300 border-t-neutral-800 dark:border-t-zinc-200" rounded="full" />
            </Row>
          ) : items.length === 0 ? (
            <Text paddingY="3xl" className="text-[var(--appkit-color-text-muted)]" size="sm" align="center">
              {labels.empty ?? "Your cart is empty"}
            </Text>
          ) : (
            items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                onQtyChange={onQtyChange}
                onRemove={onRemove}
              />
            ))
          )}
        </Stack>
        {items.length > 0 && (
          <Stack border="top" className={__P.p4} gap="md">
            <Row textSize="sm" justify="between">
              <Span className="text-[var(--appkit-color-text-muted)]">
                {labels.subtotal ?? "Subtotal"}
              </Span>
              <Span weight="semibold">
                {formatCurrency(subtotal, currency)}
              </Span>
            </Row>
            {onCheckout && (
              <Button rounded="xl"
                onClick={onCheckout}
                variant="primary"
                textSize="sm"
                className="w-full bg-neutral-900 py-[0.75rem] font-[600] text-white transition hover:bg-neutral-800"
              >
                {labels.checkout ?? ACTIONS.CART["checkout"].label}
              </Button>
            )}
          </Stack>
        )}
        </Stack>
      </Aside>
    </>
  );
}
