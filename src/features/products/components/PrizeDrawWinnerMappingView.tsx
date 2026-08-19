"use client";

/**
 * PrizeDrawWinnerMappingView
 *
 * Read-only item→order mapping for a classic reveal-mode prize draw. Shown
 * only to admin and the owning seller (never publicly) so they know which
 * physical item to ship for which order. Mirrors LotteryEntriesView's choice
 * of a small bounded DataTable (≤16 rows per draw) rather than a paginated
 * DataListingView.
 */

import { Badge, Container, DataTable, Div, Heading, Row, Section, Stack, Text, TextLink, type DataTableColumn } from "../../../ui";
import { MediaImage } from "../../media/MediaImage";
import { ROUTES } from "../../../next";

export interface PrizeDrawWinnerMappingRow {
  itemNumber: number;
  title: string;
  image?: string;
  isWon: boolean;
  wonByOrderId?: string;
}

export interface PrizeDrawWinnerMappingViewProps {
  title?: string;
  items: PrizeDrawWinnerMappingRow[];
  isAdmin: boolean;
}

export function PrizeDrawWinnerMappingView({
  title = "Prize Draw — Winner Mapping",
  items,
  isAdmin,
}: PrizeDrawWinnerMappingViewProps) {
  const columns: DataTableColumn<PrizeDrawWinnerMappingRow>[] = [
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

export default PrizeDrawWinnerMappingView;
