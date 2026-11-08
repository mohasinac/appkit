"use client";

import React, { useState } from "react";
import { Stack, Row, Container } from "../../../../ui/components/Layout";
import { Text, Heading } from "../../../../ui/components/Typography";
import { Badge } from "../../../../ui/components/Badge";
import { Button } from "../../../../ui/components/Button";
import { Section } from "../../../../ui/components/Semantic";
import { DataTable } from "../../../../ui/DataTable";
import type { DataTableColumn } from "../../../../ui/DataTable";
import { Dialog } from "../../../../ui/components/Dialog";
import { FieldTextarea } from "../../../../ui/forms/FieldTextarea";
import { AdminComposableRegion } from "../../../../features/dashboard/components/AdminComposableRegion";
import type { DashboardCard } from "../../../shared/features/dashboard/recent-entry";

interface GiveawayEntryRow {
  id: string;
  userGiveawayNumber: number;
  userDisplayName?: string;
  userId: string;
  transactionId?: string;
  userPhone?: string;
  assignedPrizeSlotNumber?: number;
  status: string;
  isFlagged: boolean;
  submittedAt?: string | Date;
}

interface GiveawayEntriesViewProps {
  sourceType: "event" | "product";
  sourceId: string;
  entries: GiveawayEntryRow[];
  isAdmin: boolean;
  isStoreOwner?: boolean;
  onFlagEntry?: (entryId: string, flagNote: string) => Promise<void>;
  onReopenSlot?: (slotNumber: number) => Promise<void>;
  /**
   * Stable, hand-chosen page-region id (Phase 12) — this one view is shared
   * by three distinct routes (the admin giveaway entries page, and the admin
   * + store clearance entries pages), so every caller computes its own
   * route-template-derived id rather than this component guessing one.
   */
  pageId: string;
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
}

export function GiveawayEntriesView({
  entries,
  isAdmin,
  isStoreOwner = false,
  onFlagEntry,
  onReopenSlot,
  pageId,
  pageRegionCards = [],
}: GiveawayEntriesViewProps) {
  const [flaggingId, setFlaggingId] = useState<string | null>(null);
  const [flagNote, setFlagNote] = useState("");

  const canViewSensitive = isAdmin || isStoreOwner;

  const columns: DataTableColumn<GiveawayEntryRow>[] = [
    {
      key: "userGiveawayNumber",
      header: "#",
      render: (e) => <Text size="sm" weight="semibold" family="mono">#{e.userGiveawayNumber}</Text>,
    },
    {
      key: "userDisplayName",
      header: "Participant",
      render: (e) => <Text size="sm">{e.userDisplayName ?? e.userId}</Text>,
    },
    ...(canViewSensitive
      ? [
          {
            key: "transactionId",
            header: "TX ID",
            render: (e: GiveawayEntryRow) => <Text size="xs" color="muted" family="mono">{e.transactionId ?? "—"}</Text>,
          },
          {
            key: "userPhone",
            header: "Phone",
            render: (e: GiveawayEntryRow) => <Text size="xs" color="muted" family="mono">{e.userPhone ?? "—"}</Text>,
          },
        ] as DataTableColumn<GiveawayEntryRow>[]
      : []),
    {
      key: "assignedPrizeSlotNumber",
      header: "Slot",
      render: (e) =>
        e.assignedPrizeSlotNumber != null ? (
          <Badge variant="info" size="sm">Slot #{e.assignedPrizeSlotNumber}</Badge>
        ) : (
          <Text size="sm">—</Text>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (e) => (
        <Badge
          variant={
            e.status === "drawn" || e.status === "won" ? "success"
              : e.status === "flagged" ? "danger"
                : e.status === "cancelled" ? "secondary"
                  : "warning"
          }
          size="sm"
        >
          {e.status}
        </Badge>
      ),
    },
  ];

  return (
    <Container>
      <Section>
        <Stack gap="lg">
          <Heading level={1} size="2xl" weight="bold">Giveaway Entries</Heading>
          <Text color="muted">{entries.length} {entries.length === 1 ? "entry" : "entries"} total</Text>
          <AdminComposableRegion pageId={pageId} initialCards={pageRegionCards} />

          <DataTable
            data={entries}
            columns={columns}
            keyExtractor={(e) => e.id}
            emptyMessage="No entries yet."
            actions={
              isAdmin
                ? (entry) => (
                    <Row gap="xs">
                      {!entry.isFlagged && onFlagEntry && (
                        <Button variant="danger" size="sm" onClick={() => { setFlaggingId(entry.id); setFlagNote(""); }}>Flag</Button>
                      )}
                      {entry.isFlagged && entry.assignedPrizeSlotNumber != null && onReopenSlot && (
                        <Button variant="secondary" size="sm" onClick={() => onReopenSlot(entry.assignedPrizeSlotNumber!)}>Reopen Slot</Button>
                      )}
                    </Row>
                  )
                : undefined
            }
          />

          <Dialog
            open={!!flaggingId}
            onClose={() => setFlaggingId(null)}
            padding="lg"
            aria-label="Flag entry"
          >
            <Stack gap="md">
              <Heading level={2} size="xl" weight="bold">Flag This Entry?</Heading>
              <Text color="muted" size="sm">
                Entry will be marked as fraudulent. Their claimed slot stays booked until you manually reopen it.
              </Text>
              <FieldTextarea
                name="flagNote"
                label="Reason for flagging"
                required
                value={flagNote}
                onChange={(v: string) => setFlagNote(v)}
                rows={3}
              />
              <Row gap="sm" justify="end">
                <Button variant="ghost" onClick={() => setFlaggingId(null)}>Cancel</Button>
                <Button
                  variant="danger"
                  disabled={!flagNote.trim()}
                  onClick={async () => {
                    if (onFlagEntry && flaggingId && flagNote.trim()) {
                      await onFlagEntry(flaggingId, flagNote.trim());
                      setFlaggingId(null);
                    }
                  }}
                >
                  Flag Entry
                </Button>
              </Row>
            </Stack>
          </Dialog>
        </Stack>
      </Section>
    </Container>
  );
}
