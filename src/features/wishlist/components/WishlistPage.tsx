import { Button, Div, Stack, Text } from "../../../ui";
import type { WishlistItem } from "../types";
import { formatCurrency } from "../../../utils/number.formatter";
import { THEME_CONSTANTS } from "../../../tokens";

const CLS_REMOVE_BTN = "self-start text-zinc-400 dark:text-zinc-400 transition hover:text-error";

interface WishlistCardProps {
  item: WishlistItem;
  onRemove?: (id: string) => void;
  onProductClick?: (item: WishlistItem) => void;
}

export function WishlistCard({
  item,
  onRemove,
  onProductClick,
}: WishlistCardProps) {
  return (
    <Div surface="card" padding="sm" className="flex gap-4">
      <Div
        role={onProductClick ? "button" : undefined}
        tabIndex={onProductClick ? 0 : undefined}
        onClick={onProductClick ? () => onProductClick(item) : undefined}
        onKeyDown={
          onProductClick
            ? (e) => e.key === "Enter" && onProductClick(item)
            : undefined
        }
        className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-slate-800 ${onProductClick ? "cursor-pointer" : ""}`}
      >
        {item.productImage && (
          <Div
            role="img"
            aria-label={item.productTitle ?? ""}
            className="h-full w-full bg-center bg-cover"
            // audit-inline-style-ok: dynamic image URL
            style={{ backgroundImage: `url(${item.productImage})` }}
          />
        )}
      </Div>
      <Div className="flex flex-1 flex-col justify-between">
        <Text className={`font-medium text-neutral-900 dark:text-zinc-100 ${THEME_CONSTANTS.utilities.textClamp2}`}>
          {item.productTitle}
        </Text>
        {item.productPrice !== undefined && (
            <Text className="text-neutral-900 dark:text-zinc-100" size="sm" weight="semibold">
            {formatCurrency(item.productPrice, item.productCurrency)}
          </Text>
        )}
      </Div>
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(item.id)}
          aria-label="Remove from wishlist"
          className={CLS_REMOVE_BTN}
        >
          ✕
        </Button>
      )}
    </Div>
  );
}

interface WishlistPageProps {
  items: WishlistItem[];
  isLoading?: boolean;
  onRemove?: (id: string) => void;
  onProductClick?: (item: WishlistItem) => void;
  emptyLabel?: string;
}

export function WishlistPage({
  items,
  isLoading,
  onRemove,
  onProductClick,
  emptyLabel = "Your wishlist is empty",
}: WishlistPageProps) {
  if (isLoading) {
    return (
      <Stack gap="md">
        {Array.from({ length: 4 }).map((_, i) => (
          <Div
            key={i}
            className="flex animate-pulse gap-4 border border-neutral-200" rounded="xl" padding="md"
          >
            <Div className="h-20 w-20 bg-neutral-200" rounded="lg" />
            <Stack gap="sm" className="flex-1">
              <Div className="h-4 w-3/4 rounded bg-neutral-200 dark:bg-slate-700" />
              <Div className="h-4 w-1/3 rounded bg-neutral-200 dark:bg-slate-700" />
            </Stack>
          </Div>
        ))}
      </Stack>
    );
  }

  if (items.length === 0) {
    return (
      <Text className="py-16 text-zinc-500 dark:text-zinc-400" size="sm" align="center">
        {emptyLabel}
      </Text>
    );
  }

  return (
    <Stack gap="md">
      {items.map((item) => (
        <WishlistCard
          key={item.id}
          item={item}
          onRemove={onRemove}
          onProductClick={onProductClick}
        />
      ))}
    </Stack>
  );
}
