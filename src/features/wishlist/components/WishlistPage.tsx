import { Button, Div, Stack, Text } from "../../../ui";
import type { WishlistItem } from "../types";
import { formatCurrency } from "../../../utils/number.formatter";

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
    <Div layout="flex" gap="4" surface="card" padding="sm">
      <Div
        role={onProductClick ? "button" : undefined}
        tabIndex={onProductClick ? 0 : undefined}
        onClick={onProductClick ? () => onProductClick(item) : undefined}
        onKeyDown={
          onProductClick
            ? (e) => e.key === "Enter" && onProductClick(item)
            : undefined
        }
        className={`h-20 w-20 flex-shrink-0 overflow-hidden bg-neutral-100 dark:bg-slate-800 ${onProductClick ? "cursor-pointer" : ""}`} rounded="lg"
      >
        {item.productImage && (
          <img
            src={item.productImage}
            alt={item.productTitle ?? ""}
            className="h-full w-full object-cover"
          />
        )}
      </Div>
      <Stack justify="between" className="flex-1">
        <Text truncate={2} weight="medium" color="primary">
          {item.productTitle}
        </Text>
        {item.productPrice !== undefined && (
            <Text className="text-neutral-900 dark:text-neutral-100" size="sm" weight="semibold">
            {formatCurrency(item.productPrice, item.productCurrency)}
          </Text>
        )}
      </Stack>
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
          <Div layout="flex" gap="4" 
            key={i}
            className="animate-pulse border border-neutral-200" rounded="xl" padding="md"
          >
            <Div className="h-20 w-20 bg-neutral-200" rounded="lg" />
            <Stack gap="sm" className="flex-1">
              <Div className="h-4 w-3/4 bg-neutral-200" rounded="default" />
              <Div className="h-4 w-1/3 bg-neutral-200" rounded="default" />
            </Stack>
          </Div>
        ))}
      </Stack>
    );
  }

  if (items.length === 0) {
    return (
      <Text paddingY="4xl" color="muted" size="sm" align="center">
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
