import type { CartItem } from "../types";
import { Aside, Button, Div, Heading, Row, Span, Text } from "../../../ui";
import { formatCurrency } from "../../../utils/number.formatter";
import { THEME_CONSTANTS } from "../../../tokens";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";

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
    <Div className={`flex gap-4 rounded-xl border bg-white dark:bg-slate-900 p-4 transition-opacity ${isOutOfStock ? "border-neutral-200 dark:border-slate-700 opacity-60" : "border-neutral-200 dark:border-slate-700"}`}>
      <Div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-slate-800">
        {item.meta.image && (
          <Div
            role="img"
            aria-label={item.meta.title}
            className="h-full w-full bg-center bg-cover"
            style={{ backgroundImage: `url(${item.meta.image})` }}
          />
        )}
      </Div>
      <Div className="flex flex-1 flex-col justify-between">
        <Div className="flex items-start gap-1.5">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`font-medium text-neutral-900 dark:text-zinc-100 hover:underline underline-offset-2 ${THEME_CONSTANTS.utilities.textClamp2}`}
            >
              {item.meta.title}
            </a>
          ) : (
            <Text className={`font-medium text-neutral-900 dark:text-zinc-100 ${THEME_CONSTANTS.utilities.textClamp2}`}>
              {item.meta.title}
            </Text>
          )}
          {isOutOfStock && (
            <Span className="flex-shrink-0 rounded bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--appkit-color-error)]">
              Out of Stock
            </Span>
          )}
        </Div>
        {item.meta.attributes &&
          Object.keys(item.meta.attributes).length > 0 && (
            <Text className="text-xs text-neutral-500 dark:text-zinc-400">
              {Object.entries(item.meta.attributes)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ")}
            </Text>
          )}
        <Row justify="between">
          <Text className="font-semibold text-neutral-900 dark:text-zinc-100">
            {formatCurrency(
              item.meta.price * item.quantity,
              item.meta.currency,
            )}
          </Text>
          {onQtyChange && !isOutOfStock && (
            <Row className="gap-2">
              <Button
                onClick={() => onQtyChange(item.id, item.quantity - 1)}
                disabled={item.quantity <= 1}
                variant="outline"
                size="sm"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 dark:border-slate-600 text-sm disabled:opacity-40"
              >
                −
              </Button>
              <Span className="min-w-[1.5rem] text-center text-sm">
                {item.quantity}
              </Span>
              <Button
                onClick={() => onQtyChange(item.id, item.quantity + 1)}
                variant="outline"
                size="sm"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 dark:border-slate-600 text-sm"
              >
                +
              </Button>
            </Row>
          )}
          {isOutOfStock && (
            <Span className="text-xs text-neutral-400 dark:text-zinc-500">Qty: {item.quantity}</Span>
          )}
        </Row>
      </Div>
      {onRemove && (
        <Button
          onClick={() => onRemove(item.id)}
          variant="ghost"
          size="sm"
          aria-label={ACTIONS.CART["remove-item"].ariaLabel}
          className="self-start text-neutral-400 dark:text-zinc-500 transition hover:text-red-500"
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
      <Div
        role="presentation"
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <Aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white dark:bg-slate-900 shadow-xl">
        <Row justify="between" className="border-b border-neutral-200 dark:border-slate-700 p-4">
          <Heading level={2} className="text-lg font-semibold">
            {labels.title ?? "Cart"}
          </Heading>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            aria-label="Close cart"
            className="text-neutral-500 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-zinc-100"
          >
            ✕
          </Button>
        </Row>
        <Div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <Div className="flex justify-center py-12">
              <Div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 dark:border-slate-600 border-t-neutral-800 dark:border-t-zinc-200" />
            </Div>
          ) : items.length === 0 ? (
            <Text className="py-12 text-center text-sm text-neutral-500 dark:text-zinc-400">
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
        </Div>
        {items.length > 0 && (
          <Div className="border-t border-neutral-200 dark:border-slate-700 p-4 space-y-4">
            <Row justify="between" className="text-sm">
              <Span className="text-neutral-600 dark:text-zinc-300">
                {labels.subtotal ?? "Subtotal"}
              </Span>
              <Span className="font-semibold">
                {formatCurrency(subtotal, currency)}
              </Span>
            </Row>
            {onCheckout && (
              <Button
                onClick={onCheckout}
                variant="primary"
                className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                {labels.checkout ?? ACTIONS.CART["checkout"].label}
              </Button>
            )}
          </Div>
        )}
      </Aside>
    </>
  );
}
