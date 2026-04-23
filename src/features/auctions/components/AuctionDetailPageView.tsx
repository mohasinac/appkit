import React from "react";
import Link from "next/link";
import { productRepository } from "../../../repositories";
import { ROUTES } from "../../../next";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import {
  Button,
  Container,
  Div,
  Heading,
  Input,
  Main,
  Row,
  Section,
  Span,
  Stack,
  Text,
} from "../../../ui";
import { AuctionDetailView } from "../../products/components/AuctionDetailView";

export interface AuctionDetailPageViewProps {
  id: string;
}

export async function AuctionDetailPageView({ id }: AuctionDetailPageViewProps) {
  const product = await productRepository.findByIdOrSlug(id).catch(() => undefined);

  if (!product) {
    return (
      <Main>
        <Section className="py-20">
          <Container size="md">
            <Stack align="center" gap="md" className="text-center">
              <Heading level={1} className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Auction Not Found
              </Heading>
              <Text className="text-zinc-500">
                This auction may have ended or the link is incorrect.
              </Text>
              <Link href={String(ROUTES.PUBLIC.AUCTIONS)} className="text-sm font-medium text-primary-600 hover:underline">
                Browse Auctions
              </Link>
            </Stack>
          </Container>
        </Section>
      </Main>
    );
  }

  const p = product as Record<string, any>;
  const currency = p.currency || getDefaultCurrency();
  const currentBid = typeof p.currentBid === "number" ? p.currentBid : p.startingBid ?? p.price ?? 0;
  const currentBidFormatted = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(currentBid);
  const startingBidFormatted = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(p.startingBid ?? p.price ?? 0);

  const images: string[] = Array.isArray(p.images) ? p.images : p.imageUrl ? [p.imageUrl] : [];
  const primaryImage = images[0];

  const endDate = p.auctionEndDate ? new Date(p.auctionEndDate) : null;
  const isEnded = endDate ? endDate < new Date() : false;
  const bidCount = typeof p.bidCount === "number" ? p.bidCount : 0;

  return (
    <AuctionDetailView
      renderGallery={() =>
        primaryImage ? (
          <Div className="overflow-hidden rounded-xl border border-zinc-100 dark:border-zinc-800">
            <Div
              role="img"
              aria-label={p.title ?? p.name ?? "Auction item"}
              className="aspect-square w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${primaryImage})` }}
            />
          </Div>
        ) : (
          <Div className="overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
            <Div className="flex aspect-square items-center justify-center text-zinc-300 dark:text-zinc-700">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </Div>
          </Div>
        )
      }
      renderInfo={() => (
        <Stack gap="md">
          <Heading level={1} className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {p.title ?? p.name ?? "Auction Item"}
          </Heading>
          <Row align="center" gap="sm" wrap>
            <Span className="text-2xl font-semibold text-primary-600 dark:text-primary-400">
              {currentBidFormatted}
            </Span>
            <Span className="text-sm text-zinc-500">
              {bidCount} {bidCount === 1 ? "bid" : "bids"}
            </Span>
            {isEnded && (
              <Span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                Ended
              </Span>
            )}
          </Row>
          {endDate && !isEnded && (
            <Text className="text-sm text-zinc-600 dark:text-zinc-400">
              Ends: {endDate.toLocaleString()}
            </Text>
          )}
          {p.description && (
            <Text className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {typeof p.description === "string" ? p.description : ""}
            </Text>
          )}
          {p.sellerName && (
            <Row align="center" gap="xs">
              <Span className="text-xs text-zinc-500">Listed by</Span>
              <Span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {p.sellerName}
              </Span>
            </Row>
          )}
        </Stack>
      )}
      renderBidForm={() => (
        <Div className="rounded-xl border border-zinc-100 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <Stack gap="sm">
            <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Current bid: {currentBidFormatted}
            </Text>
            <Text className="text-xs text-zinc-500">
              Starting bid: {startingBidFormatted}
            </Text>
            <Input
              type="number"
              placeholder={`Minimum bid`}
              min={currentBid + 1}
              aria-label="Your bid amount"
              disabled={isEnded}
            />
            <Button variant="primary" size="md" className="w-full" disabled={isEnded}>
              {isEnded ? "Auction Ended" : "Place Bid"}
            </Button>
          </Stack>
        </Div>
      )}
      renderMobileBidForm={() =>
        !isEnded ? (
          <Div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
            <Stack gap="sm">
              <Row align="center" gap="sm">
                <Span className="text-base font-semibold text-primary-600">{currentBidFormatted}</Span>
                <Span className="text-xs text-zinc-500">{bidCount} bids</Span>
              </Row>
              <Button variant="primary" size="md" className="w-full">
                Place Bid
              </Button>
            </Stack>
          </Div>
        ) : null
      }
    />
  );
}
