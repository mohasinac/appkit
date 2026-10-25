import React from "react";
import { Alert } from "../../../ui/components/Alert";
import { Badge } from "../../../ui/components/Badge";
import { Div } from "../../../ui/components/Div";
import { Grid, Row, Stack } from "../../../ui/components/Layout";
import { Heading, Text } from "../../../ui/components/Typography";
import { Section } from "../../../ui/components/Semantic";
import { TextLink } from "../../../ui/components/TextLink";
import type { AttentionCounts } from "../../../_internal/server/features/dashboard/attention";
import type { DashboardHubSection } from "../../../_internal/shared/features/dashboard/hub-sections";

/**
 * The dashboard hub — one component, two modes, zero copy of its own.
 *
 * ## Why one component and not two
 *
 * A landing page lists SECTIONS; a section hub lists SCREENS. Those read as
 * two features and are one: a grid of link cards, each with a title, a
 * sentence about what it is for, and an optional count of things waiting. Same
 * prop surface, same renderer — which the Duplication Framework calls a
 * consolidate-on-sight ("copies accept the same parameters and return the same
 * shape"), not a Rule-of-Three wait.
 *
 * The thing it must not become is `AdminGuideHubView`, which is the visual
 * pattern here and hand-writes its own 13-card list — so a guide added to the
 * nav never appears on it. Every card below comes from a nav item's existing
 * `label` and `description`.
 *
 * ## Not a client component
 *
 * It takes plain data and renders. No hook, no fetch, no `"use client"` — the
 * page that mounts it is already per-request (its layout reads the session), so
 * the counts arrive with the render rather than costing a second invocation
 * after it. See `_internal/server/features/dashboard/data.ts`.
 *
 * ## No icons, on purpose
 *
 * A nav item carries no `iconKey`, so icons would mean a hand-written map of
 * 22 sections or ~130 screens — a second list to drift from the first, which is
 * the whole defect this feature exists to avoid (Root Cause #61). The section
 * heading plus the card's own sentence is the distinction; `<Badge>` carries
 * the only signal that needs to catch the eye.
 */

export interface DashboardHubViewProps {
  /**
   * Page heading. Omit when the grid is embedded in a page that already has
   * one — `/store` renders it inside a `CollapsibleSection`, and a second
   * `<h1>` mid-page breaks the heading outline for a screen reader.
   */
  title?: string;
  /** One sentence under the heading. Only rendered alongside a `title`. */
  description?: string;
  /**
   * What to render.
   *
   * - `"sections"` — one card per section, linking to its hub. The landing page.
   * - `"screens"` — one card per screen in `sections[0]`. A section hub.
   *
   * 🛑 A hub is passed a ONE-section array rather than a section plus a mode
   * flag, so the two modes cannot disagree about what they are rendering.
   */
  mode: "sections" | "screens";
  sections: DashboardHubSection[];
  /** Built by the caller from `ROUTES.{PORTAL}.SECTION(slug)`. */
  sectionHrefs: Record<string, string>;
  counts: AttentionCounts;
  /**
   * Rendered above the cards — the live stat tiles on `/store` and `/user`.
   *
   * Those are real data and stay: the plan's "bland tile walls" are the
   * undifferentiated grids of ~19 nav shortcuts, not the figures beside them.
   * Deleting a working panel while replacing its neighbour is Root Cause #60's
   * shape, so the slot exists and the caller keeps passing them.
   */
  above?: React.ReactNode;
  /** Shown when the viewer can see nothing at all. */
  emptyMessage?: string;
  /**
   * Render "7 screens" on a section card. Default `true`.
   *
   * 🛑 Pass `false` whenever `sections` has NOT been through every filter that
   * applies to the portal. `/store` is the live case: its entitlement filter
   * (`filterStoreNavGroups`) runs in the layout and on the hub pages, but the
   * client landing does not hold the store document, so its "Listings" card
   * would claim nine screens where the seller can reach six. The section itself
   * is still correct — it is the COUNT that would over-promise, so the count is
   * withheld rather than guessed.
   */
  showScreenCount?: boolean;
}

/**
 * Sum of the counts inside a section, or `null` when it has none.
 *
 * 🛑 `null` and `0` are different answers and a card renders only the first as
 * "no badge". A section whose every count FAILED must not read as "nothing
 * waiting" (Root Cause #72), so a failed read inside an otherwise-countless
 * section stays `null` rather than collapsing to a sum of zero.
 */
function sectionTotal(section: DashboardHubSection, counts: AttentionCounts): number | null {
  let total: number | null = null;
  for (const item of section.items) {
    const value = item.id ? counts[item.id] : undefined;
    if (typeof value !== "number") continue;
    total = (total ?? 0) + value;
  }
  return total;
}

/** A count worth showing. Zero is not — a `0` badge is noise on every card. */
function badgeFor(value: number | null | undefined): React.ReactNode {
  if (typeof value !== "number" || value <= 0) return null;
  return (
    <Badge variant="warning" aria-label={`${value} waiting`}>
      {value}
    </Badge>
  );
}

interface HubCard {
  key: string;
  href: string;
  label: string;
  description?: string;
  count: number | null;
  /** "7 screens" on a section card; the screen's own keywords are not shown. */
  meta?: string;
}

function CardGrid({ cards }: { cards: HubCard[] }) {
  return (
    <Grid cols="cards" gap="md">
      {cards.map((card) => (
        <TextLink
          key={card.key}
          variant="bare"
          href={card.href}
          rounded="xl"
          layout="flex-col"
          gap="sm"
          paddingX="lg"
          paddingY="lg"
          shadow="hover-md"
          className="group border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] hover:border-[var(--appkit-color-primary)] transition-all"
        >
          <Row align="center" justify="between" gap="sm" className="min-w-0 w-full">
            <Text
              weight="semibold"
              className="min-w-0 text-[var(--appkit-color-text)] group-hover:text-[var(--appkit-color-primary)] transition-colors"
            >
              {card.label}
            </Text>
            {badgeFor(card.count)}
          </Row>
          {card.description && (
            <Text size="sm" className="text-[var(--appkit-color-text-muted)] leading-relaxed">
              {card.description}
            </Text>
          )}
          {card.meta && (
            <Text size="xs" className="text-[var(--appkit-color-text-faint)] mt-auto">
              {card.meta}
            </Text>
          )}
        </TextLink>
      ))}
    </Grid>
  );
}

export function DashboardHubView({
  title,
  description,
  mode,
  sections,
  sectionHrefs,
  counts,
  above,
  emptyMessage,
  showScreenCount = true,
}: DashboardHubViewProps) {
  const hasAny = sections.some((section) => section.items.length > 0);

  return (
    <Stack gap="lg">
      {title && (
        <Stack gap="xs">
          <Heading level={1} size="xl" weight="semibold" color="primary">
            {title}
          </Heading>
          {description && (
            <Text size="sm" color="muted">
              {description}
            </Text>
          )}
        </Stack>
      )}

      {above}

      {!hasAny && (
        <Alert variant="info" title="Nothing here yet">
          {emptyMessage ??
            "Your permission set doesn't include access to any of these screens yet. Ask an admin for the permissions you need."}
        </Alert>
      )}

      {hasAny && mode === "sections" && (
        <CardGrid
          cards={sections.map((section) => ({
            key: section.slug,
            href: sectionHrefs[section.slug] ?? "",
            label: section.title,
            /*
             * A section has no description of its own and must not invent one —
             * so it names what is inside it instead. `items.length` is the
             * post-filter count, which is what this viewer will actually find
             * PROVIDED every filter has run; see `showScreenCount`.
             */
            meta: showScreenCount
              ? `${section.items.length} ${section.items.length === 1 ? "screen" : "screens"}`
              : undefined,
            count: sectionTotal(section, counts),
          }))}
        />
      )}

      {hasAny &&
        mode === "screens" &&
        sections.map((section) => (
          <Section key={section.slug}>
            {/*
              The heading renders even in single-section mode: a hub reached by
              URL needs to say which section it is, and the sidebar's own group
              header is collapsed on mobile.
            */}
            <Heading level={2} size="lg" weight="semibold" className="mb-4 text-[var(--appkit-color-text)]">
              {section.title}
            </Heading>
            <CardGrid
              cards={section.items.map((item) => ({
                key: item.id ?? item.href,
                href: item.href,
                label: item.label,
                description: item.description,
                count: item.id ? (counts[item.id] ?? null) : null,
              }))}
            />
          </Section>
        ))}

      {hasAny && mode === "sections" && (
        <Div>
          <Text size="xs" color="faint">
            Every card above is a section of the sidebar. The screens inside one
            are the same screens, with a sentence each on what they are for.
          </Text>
        </Div>
      )}
    </Stack>
  );
}
