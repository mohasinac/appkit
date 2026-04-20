import type { ReactNode } from "react";
import { Gavel } from "lucide-react";
import type { WishlistToggleActions } from "../../wishlist";
import { Div, Row, Span, Stack, Text } from "../../../ui";
import {
  MarketplaceAuctionCard,
  type MarketplaceAuctionCardData,
  type MarketplaceAuctionCardLabels,
} from "./MarketplaceAuctionCard";

export interface MarketplaceAuctionGridLabels {
  emptyTitle?: string;
  emptyDescription?: string;
}

export interface MarketplaceAuctionGridProps {
  auctions: MarketplaceAuctionCardData[];
  loading?: boolean;
  skeletonCount?: number;
  variant?: "grid" | "card" | "fluid" | "list";
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  gridClassName?: string;
  emptyIcon?: ReactNode;
  labels?: MarketplaceAuctionGridLabels;
  cardLabels?: MarketplaceAuctionCardLabels;
  wishlistActions?: WishlistToggleActions;
}

const DEFAULT_GRID_LABELS: Required<MarketplaceAuctionGridLabels> = {
  emptyTitle: "No auctions found",
  emptyDescription: "Check back later for live listings.",
};

function AuctionCardSkeleton({
  variant = "grid",
}: {
  variant?: "grid" | "card" | "fluid" | "list";
}) {
  if (variant === "list") {
    return (
      <Div className="flex min-h-[220px] flex-row overflow-hidden rounded-xl bg-zinc-200 animate-pulse">
        <Div className="aspect-square w-40 flex-shrink-0 bg-zinc-300" />
        <Div className="flex-1 space-y-2 p-3">
          <Div className="h-4 w-2/3 rounded bg-zinc-300" />
          <Div className="h-3 w-full rounded bg-zinc-300" />
          <Div className="h-3 w-3/4 rounded bg-zinc-300" />
          <Div className="h-5 w-1/2 rounded bg-zinc-300" />
          <Row gap="sm">
            <Div className="h-8 flex-1 rounded bg-zinc-300" />
            <Div className="h-8 flex-1 rounded bg-zinc-300" />
          </Row>
        </Div>
      </Div>
    );
  }

  return (
    <Div className="overflow-hidden rounded-xl bg-zinc-200 animate-pulse">
      <Div className="aspect-square bg-zinc-300" />
      <Div className="space-y-2 p-3">
        <Div className="h-4 w-3/4 rounded bg-zinc-300" />
        <Div className="h-3 w-1/3 rounded bg-zinc-300" />
        <Div className="h-5 w-1/2 rounded bg-zinc-300" />
        <Row justify="between">
          <Div className="h-3 w-1/4 rounded bg-zinc-300" />
          <Div className="h-3 w-1/3 rounded bg-zinc-300" />
        </Row>
        <Row gap="sm">
          <Div className="h-8 flex-1 rounded bg-zinc-300" />
        </Row>
      </Div>
    </Div>
  );
}

export function MarketplaceAuctionGrid({
  auctions,
  loading = false,
  skeletonCount = 12,
  variant = "grid",
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  gridClassName,
  emptyIcon,
  labels,
  cardLabels,
  wishlistActions,
}: MarketplaceAuctionGridProps) {
  const mergedLabels = { ...DEFAULT_GRID_LABELS, ...labels };

  const handleSelect = (id: string, selected: boolean) => {
    if (!onSelectionChange) return;
    if (selected) {
      onSelectionChange([...selectedIds, id]);
      return;
    }
    onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
  };

  const containerClass =
    variant === "list"
      ? "flex flex-col gap-4"
      : `${gridClassName ?? "grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4"}`;

  if (loading) {
    return (
      <Div className={containerClass}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <AuctionCardSkeleton
            key={`auction-skeleton-${index}`}
            variant={variant}
          />
        ))}
      </Div>
    );
  }

  if (auctions.length === 0) {
    return (
      <Stack
        align="center"
        gap="3"
        className="justify-center py-24 text-center"
      >
        {emptyIcon ?? <Gavel className="h-16 w-16" />}
        <Text className="text-xl font-medium text-zinc-900">
          {mergedLabels.emptyTitle}
        </Text>
        <Text className="text-sm text-zinc-500">
          {mergedLabels.emptyDescription}
        </Text>
      </Stack>
    );
  }

  return (
    <Div className={containerClass}>
      {auctions.map((auction) => (
        <MarketplaceAuctionCard
          key={auction.id}
          product={auction}
          variant={variant}
          selectable={selectable}
          isSelected={selectedIds.includes(auction.id)}
          onSelect={handleSelect}
          labels={cardLabels}
          wishlistActions={wishlistActions}
        />
      ))}
    </Div>
  );
}
