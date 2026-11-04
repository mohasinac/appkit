"use client";
import { Button } from "../../../ui/components/Button";
import { Div } from "../../../ui/components/Div";
import { Icon } from "../../../ui/components/Icon";
import { Grid, Row, Stack } from "../../../ui/components/Layout";
import { Text } from "../../../ui/components/Typography";
import { useEditMode } from "../../../_internal/client/edit-mode/EditModeProvider";
import { usePageRegion } from "../hooks/usePageRegion";
import { DashboardCardView } from "./DashboardCardRenderer";
import type { DashboardCard, FunctionalSlotId } from "../../../_internal/shared/features/dashboard/recent-entry";
import type { ReactNode } from "react";
import { isContentVisible, type ContentFlagSnapshot } from "../../../_internal/shared/features/content-tags/registry";

export interface AdminComposableRegionProps {
  /** Stable, hand-chosen id for this page's region — see `usePageRegion`'s own doc comment for why it's not route-derived. */
  pageId: string;
  /** Server-read via `getPageRegion(pageId)` (appkit `server.ts`) — the page's own `page.tsx` fetches this, never a client round-trip. */
  initialCards: DashboardCard[];
  /** Small uppercase label above the region, shown only when it has content or is in edit mode. Omit for no heading. */
  title?: string;
  /**
   * Server-read via `siteSettingsRepository.getFlagSnapshot()` — same
   * pattern `getHomepageFaqsCached`/`faq-actions.ts` already use to filter
   * `contentTags`-gated documents. A card whose tags are no longer
   * satisfied is filtered out for everyone NOT in edit mode (owner's
   * instruction, 2026-11-03: widgets gate on tags "from the admin"); an
   * admin in edit mode still sees it, dimmed, so they can retag or remove
   * it — same "admin can always reach what they just turned off" rule
   * `useFieldVisibility`'s own mechanism already follows. Omit (or pass
   * `null`) on a page that never tags its cards — every card then renders
   * unconditionally, identical to before this prop existed.
   */
  flagSnapshot?: ContentFlagSnapshot | null;
  /**
   * Live content for any `functionalSlot` cards composed into this region —
   * see `recent-entry.ts`'s `functionalSlot` doc comment and
   * `FunctionalSlotLookup` in `DashboardCardRenderer.tsx`. Omit on a page
   * that declares no functional slots; a `functionalSlot` element with no
   * matching key renders its own "not available here" fallback rather than
   * breaking.
   */
  functionalSlots?: Partial<Record<FunctionalSlotId, ReactNode>>;
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
export function AdminComposableRegion({ pageId, initialCards, title, flagSnapshot, functionalSlots }: AdminComposableRegionProps) {
  const { editMode } = useEditMode();
  const { cards: allCards, createCard, removeCard, updateCard } = usePageRegion(pageId, initialCards);

  // A real visitor (or an admin with edit mode off — Phase 3's own "sees
  // exactly what a buyer sees" guarantee) never sees a tag-gated card once
  // its tag stops being satisfied. In edit mode every card stays visible,
  // dimmed, so an admin can retag or remove it rather than it silently
  // vanishing from the editor along with the public render.
  const cards = editMode ? allCards : allCards.filter((c) => isContentVisible(c.contentTags, flagSnapshot));

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
          {cards.map((card) => {
            const tagHidden = editMode && !isContentVisible(card.contentTags, flagSnapshot);
            return (
              <Div key={card.id} className={tagHidden ? "opacity-50" : undefined}>
                {tagHidden && (
                  <Text size="xs" color="muted" className="mb-1">
                    Hidden — tagged flag is off
                  </Text>
                )}
                <DashboardCardView
                  card={card}
                  editable={editMode}
                  toggles={[]}
                  charts={[]}
                  settingsPreviews={[]}
                  onToggle={async () => {}}
                  onRemove={() => removeCard(card.id)}
                  onUpdate={(patch) => updateCard(card.id, patch)}
                  functionalSlots={functionalSlots}
                />
              </Div>
            );
          })}
        </Grid>
      )}
    </Stack>
  );
}
