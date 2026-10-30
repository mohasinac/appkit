"use client";

/**
 * RandomLotsWinnerMappingView
 *
 * Read-only item→order mapping for a classic reveal-mode prize draw. Shown
 * only to admin and the owning seller (never publicly) so they know which
 * physical item to ship for which order. Mirrors LotteryEntriesView's choice
 * of a small bounded DataTable (≤16 rows per draw) rather than a paginated
 * DataListingView.
 */

import { Badge } from "../../../ui/components/Badge";
import { Container, Row, Stack } from "../../../ui/components/Layout";
import { DataTable } from "../../../ui/DataTable";
import type { DataTableColumn } from "../../../ui/DataTable";
import { Div } from "../../../ui/components/Div";
import { Heading, Text } from "../../../ui/components/Typography";
import { Section } from "../../../ui/components/Semantic";
import { TextLink } from "../../../ui/components/TextLink";
import { MediaImage } from "../../media/MediaImage";
import { ROUTES } from "../../../next/routing/route-map";

export interface RandomLotsWinnerMappingRow {
  itemNumber: number;
  title: string;
  image?: string;
  isWon: boolean;
  wonByOrderId?: string;
}

export interface RandomLotsWinnerMappingViewProps {
  title?: string;
  items: RandomLotsWinnerMappingRow[];
  isAdmin: boolean;
}

export function RandomLotsWinnerMappingView({
  title = "Prize Draw — Winner Mapping",
  items,
  isAdmin,
}: RandomLotsWinnerMappingViewProps) {
  const columns: DataTableColumn<RandomLotsWinnerMappingRow>[] = [
    {
      key: "itemNumber",
      header: "Item",
      render: (row) => (
        <Row gap="xs" align="center">
          {row.image ? (
            <Div className="relative h-10 w-10 shrink-0" overflow="hidden" rounded="default">
              <MediaImage src={row.image} alt={row.title} size="thumbnail" />
            </Div>
          ) : null}
          <Text size="sm" weight="medium">#{row.itemNumber} — {row.title}</Text>
        </Row>
      ),
    },
    {
      key: "isWon",
      header: "Status",
      render: (row) =>
        row.isWon ? (
          <Badge variant="success" size="sm">Won</Badge>
        ) : (
          <Badge variant="secondary" size="sm">Unclaimed</Badge>
        ),
    },
    {
      key: "wonByOrderId",
      header: "Order",
      render: (row) =>
        row.wonByOrderId ? (
          <TextLink
            href={String(
              isAdmin
                ? ROUTES.ADMIN.ORDER_DETAIL(row.wonByOrderId)
                : ROUTES.STORE.ORDER_DETAIL(row.wonByOrderId),
            )}
          >
            {row.wonByOrderId}
          </TextLink>
        ) : (
          <Text size="sm" color="muted">—</Text>
        ),
    },
  ];

  return (
    <Container>
      <Section>
        <Stack gap="lg">
          <Heading level={1} size="2xl" weight="bold">{title}</Heading>
          <Text color="muted">
            Visible only to you — buyers never see which item went to which order.
            Use this to ship the correct physical item to the correct order.
          </Text>
          <DataTable
            data={items}
            columns={columns}
            keyExtractor={(row) => String(row.itemNumber)}
            emptyMessage="No prize items."
          />
        </Stack>
      </Section>
    </Container>
  );
}

export default RandomLotsWinnerMappingView;
