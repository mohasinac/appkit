"use client";
import { Button } from "../../../ui/components/Button";
import { Div } from "../../../ui/components/Div";
import { Icon } from "../../../ui/components/Icon";
import { Grid, Row, Stack } from "../../../ui/components/Layout";
import { Text } from "../../../ui/components/Typography";
import { useEditMode } from "../../../_internal/client/edit-mode/EditModeProvider";
import { usePageRegion } from "../hooks/usePageRegion";
import { DashboardCardView } from "./DashboardCardRenderer";
import type { DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";

export interface AdminComposableRegionProps {
  /** Stable, hand-chosen id for this page's region — see `usePageRegion`'s own doc comment for why it's not route-derived. */
  pageId: string;
  /** Server-read via `getPageRegion(pageId)` (appkit `server.ts`) — the page's own `page.tsx` fetches this, never a client round-trip. */
  initialCards: DashboardCard[];
  /** Small uppercase label above the region, shown only when it has content or is in edit mode. Omit for no heading. */
  title?: string;
}

/**
 * Admin-composable page region (Phase 3B, overhaul brief — first slice).
 * Reuses Phase 9-ii's `CardElement`/`DashboardCard` primitive and its
 * card-editor chrome (`DashboardCardRenderer.tsx`, extracted from
 * `DashboardQuickJump.tsx` the moment this became a second real consumer),
 * but the DATA is SHARED across every admin — not a per-user preference —
 * so persistence goes through `usePageRegion` (a small admin-only API
 * route) rather than the per-user `uiPreferences` profile field Phase
 * 9-ii's own cards use.
 *
 * Additive only, by construction: a page with no stored cards and not in
 * edit mode renders nothing — no heading, no empty-state box, no layout
 * shift. Mount this anywhere a page's template has room for admin-curated
 * content; it does not replace or wrap the page's own existing content.
 */
export function AdminComposableRegion({ pageId, initialCards, title }: AdminComposableRegionProps) {
  const { editMode } = useEditMode();
  const { cards, createCard, removeCard, updateCard } = usePageRegion(pageId, initialCards);

  if (!editMode && cards.length === 0) return null;

  return (
    <Stack gap="sm">
      <Row justify="between" align="center">
        {title ? (
          <Text size="xs" weight="semibold" color="muted" className="uppercase tracking-widest">
            {title}
          </Text>
        ) : (
          <Div />
        )}
        {editMode && (
          <Button variant="ghost" size="sm" type="button" onClick={() => createCard()}>
            <Icon name="create" size="sm" /> New card
          </Button>
        )}
      </Row>
      {cards.length > 0 && (
        <Grid cols="cards" gap="md">
          {cards.map((card) => (
            <DashboardCardView
              key={card.id}
              card={card}
              editable={editMode}
              toggles={[]}
              charts={[]}
              settingsPreviews={[]}
              onToggle={async () => {}}
              onRemove={() => removeCard(card.id)}
              onUpdate={(patch) => updateCard(card.id, patch)}
            />
          ))}
        </Grid>
      )}
    </Stack>
  );
}
