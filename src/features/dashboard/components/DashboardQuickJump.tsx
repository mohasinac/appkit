"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../ui/components/Button";
import { Div } from "../../../ui/components/Div";
import { Grid, Row, Stack } from "../../../ui/components/Layout";
import { Input } from "../../../ui/components/Input";
import { Span, Text } from "../../../ui/components/Typography";
import { TextLink } from "../../../ui/components/TextLink";
import { Toggle } from "../../../ui/components/Toggle";
import { normalizeError } from "../../../errors/normalize";
import { useToastSafe } from "../../../ui/components/toast-context";
import { rankNavSearchResults, type NavSearchGroupedItem } from "../../shell/searchNavItems";
import { useRecentlyVisited } from "../hooks/useRecentlyVisited";
import type { RecentEntry, RecentEntryInput } from "../../../_internal/shared/features/dashboard/recent-entry";

/**
 * DashboardQuickJump — the dashboard-landing search + recent/default cards
 * (Phase 9, overhaul brief). The owner's own example: reaching Maintenance
 * mode took four clicks through Site Settings; this is a search box that
 * finds it by what it DOES ("maintenance", "down", "closed") and a card that
 * remembers it was used, with a live switch right on the card.
 *
 * 🛑 This is additive to the sidebar, never a replacement for it — the full,
 * exhaustive nav tree is untouched (see CommandPalette, AdminSidebar,
 * SellerSidebar, UserSidebar). This component is the fast, personalized path
 * for when a user doesn't want to dig through the tree.
 *
 * Search ranks via the SAME `rankNavSearchResults` the ⌘K palette uses, so
 * "maintenance" finds the same thing in both places — no second, drifting
 * copy of what counts as a good match.
 */

export type QuickJumpDefaultCard = RecentEntryInput;

export interface DashboardQuickJumpToggle {
  /** Stable id — becomes `RecentEntry.toggleId` and the search result's dedupe key. */
  toggleId: string;
  label: string;
  /** Live current state. Always read at render time by the caller — never cached here. */
  isOn: boolean;
  keywords?: string[];
  /** Resolves once the toggle has actually been saved — mirrors CommandPalette's own toggle contract. */
  onToggle: () => Promise<void>;
}

export interface DashboardQuickJumpChart {
  /** Stable id — becomes `RecentEntry.chartId`. */
  chartId: string;
  label: string;
  /** Live current value. The caller computes this on every render from data it already holds — never cached here. */
  value: string | number;
  keywords?: string[];
}

export interface DashboardQuickJumpGroup {
  title: string;
  items: { href: string; label: string; description?: string; keywords?: string[] }[];
}

export interface DashboardQuickJumpProps {
  /** `"{portal}:hub"` — same scope convention as `useHiddenHubCards`. */
  scope: string;
  /** The portal's full nav — same groups the sidebar search and ⌘K palette already use. */
  groups: DashboardQuickJumpGroup[];
  /** Shown, up to 10, when there is no visit history yet for this scope. A curated per-portal starting point, never guessed from usage. */
  defaultCards: QuickJumpDefaultCard[];
  /** Common toggles this portal makes searchable + cardable. Omit on portals with none named (store/user, for now). */
  toggles?: DashboardQuickJumpToggle[];
  /** Live chart/stat values this portal makes searchable + cardable. */
  charts?: DashboardQuickJumpChart[];
  placeholder?: string;
}

type SearchItem =
  | ({ kind: "page"; href: string } & NavSearchGroupedItem)
  | ({ kind: "toggle"; toggleId: string; isOn: boolean; onToggle: () => Promise<void> } & NavSearchGroupedItem)
  | ({ kind: "chart"; chartId: string; value: string | number } & NavSearchGroupedItem);

function searchItemKey(item: SearchItem): string {
  if (item.kind === "page") return `page:${item.href}`;
  if (item.kind === "toggle") return `toggle:${item.toggleId}`;
  return `chart:${item.chartId}`;
}

export function DashboardQuickJump({
  scope,
  groups,
  defaultCards,
  toggles = [],
  charts = [],
  placeholder = "What do you want to do?",
}: DashboardQuickJumpProps) {
  const { items: recentItems, recordVisit } = useRecentlyVisited(scope);
  const toast = useToastSafe();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const searchItems = useMemo<SearchItem[]>(() => {
    const pageItems: SearchItem[] = groups.flatMap((g) =>
      g.items.map((item) => ({
        kind: "page" as const,
        href: item.href,
        label: item.label,
        description: item.description,
        keywords: item.keywords,
        groupTitle: g.title,
      })),
    );
    const toggleItems: SearchItem[] = toggles.map((t) => ({
      kind: "toggle" as const,
      toggleId: t.toggleId,
      label: t.label,
      keywords: t.keywords,
      isOn: t.isOn,
      onToggle: t.onToggle,
      groupTitle: "Settings",
    }));
    const chartItems: SearchItem[] = charts.map((c) => ({
      kind: "chart" as const,
      chartId: c.chartId,
      label: c.label,
      keywords: c.keywords,
      value: c.value,
      groupTitle: "Stats",
    }));
    return [...pageItems, ...toggleItems, ...chartItems];
  }, [groups, toggles, charts]);

  const results = useMemo(
    () => rankNavSearchResults(searchItems, query).slice(0, 8),
    [searchItems, query],
  );

  const isSearching = query.trim().length > 0;
  // Newest-first recent entries when any exist; otherwise the curated per-portal defaults.
  const cards: (RecentEntry | QuickJumpDefaultCard)[] = recentItems.length > 0 ? recentItems : defaultCards;

  async function runToggle(toggleId: string, label: string) {
    const toggle = toggles.find((t) => t.toggleId === toggleId);
    if (!toggle || togglingId) return;
    setTogglingId(toggleId);
    try {
      await toggle.onToggle();
      recordVisit({ kind: "toggle", toggleId: toggle.toggleId, label });
    } catch (err) {
      void normalizeError(err);
      toast?.showToast(`Couldn't update "${label}" — please try again.`, "error");
    } finally {
      setTogglingId(null);
    }
  }

  function selectResult(item: SearchItem) {
    if (item.kind === "page") {
      recordVisit({ kind: "page", href: item.href, label: item.label });
      return;
    }
    if (item.kind === "toggle") {
      void runToggle(item.toggleId, item.label);
      return;
    }
    recordVisit({ kind: "chart", chartId: item.chartId, label: item.label });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const top = results[0];
    if (!top) return;
    if (top.kind === "page") {
      e.preventDefault();
      recordVisit({ kind: "page", href: top.href, label: top.label });
      router.push(top.href);
      return;
    }
    selectResult(top);
  }

  return (
    <Stack gap="md">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
      />

      {isSearching ? (
        <Stack gap="none">
          {results.length === 0 ? (
            <Text size="sm" color="muted" paddingY="md">
              No matches for &ldquo;{query}&rdquo;.
            </Text>
          ) : (
            results.map((item) => (
              <QuickJumpResultRow
                key={searchItemKey(item)}
                item={item}
                busy={item.kind === "toggle" && togglingId === item.toggleId}
                onSelect={() => selectResult(item)}
              />
            ))
          )}
        </Stack>
      ) : (
        <Grid cols="cards" gap="md">
          {cards.map((card) => (
            <QuickJumpCard
              key={card.kind === "page" ? `page:${card.href}` : card.kind === "toggle" ? `toggle:${card.toggleId}` : `chart:${card.chartId}`}
              card={card}
              toggles={toggles}
              charts={charts}
              busy={card.kind === "toggle" && togglingId === card.toggleId}
              onToggle={runToggle}
            />
          ))}
        </Grid>
      )}
    </Stack>
  );
}

function QuickJumpResultRow({
  item,
  busy,
  onSelect,
}: {
  item: SearchItem;
  busy: boolean;
  onSelect: () => void;
}) {
  if (item.kind === "page") {
    return (
      <TextLink
        variant="bare"
        href={item.href}
        onClick={onSelect}
        rounded="md"
        paddingX="sm"
        paddingY="xs"
        className="w-full hover:bg-[var(--appkit-color-surface-elevated)] transition-colors"
      >
        <Row align="center" justify="between" gap="sm">
          <Span size="sm">{item.label}</Span>
          <Span size="xs" color="muted">{item.groupTitle}</Span>
        </Row>
      </TextLink>
    );
  }

  return (
    <Button
      variant="ghost"
      type="button"
      onClick={onSelect}
      disabled={busy}
      justify="between"
      rounded="md"
      paddingX="sm"
      paddingY="xs"
      className="w-full text-left hover:bg-[var(--appkit-color-surface-elevated)]"
    >
      <Span size="sm">{item.label}</Span>
      {item.kind === "toggle" ? (
        <Span size="xs" color={item.isOn ? "success" : "muted"}>
          {busy ? "Saving…" : item.isOn ? "On" : "Off"}
        </Span>
      ) : (
        <Span size="xs" color="muted" numeric>{item.value}</Span>
      )}
    </Button>
  );
}

function QuickJumpCard({
  card,
  toggles,
  charts,
  busy,
  onToggle,
}: {
  card: RecentEntry | QuickJumpDefaultCard;
  toggles: DashboardQuickJumpToggle[];
  charts: DashboardQuickJumpChart[];
  busy: boolean;
  onToggle: (toggleId: string, label: string) => Promise<void>;
}) {
  const baseClass =
    "border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] hover:border-[var(--appkit-color-primary)] transition-all";

  if (card.kind === "page") {
    return (
      <TextLink
        variant="bare"
        href={card.href}
        rounded="xl"
        layout="flex-col"
        gap="sm"
        paddingX="lg"
        paddingY="lg"
        shadow="hover-md"
        className={`group ${baseClass}`}
      >
        <Text weight="semibold" className="text-[var(--appkit-color-text)] group-hover:text-[var(--appkit-color-primary)] transition-colors">
          {card.label}
        </Text>
      </TextLink>
    );
  }

  if (card.kind === "toggle") {
    // Live state comes from the `toggles` prop (the caller's own, always-current data), never from the card record itself.
    const live = toggles.find((t) => t.toggleId === card.toggleId);
    const isOn = live?.isOn ?? false;
    return (
      <Div rounded="xl" paddingX="x-lg" paddingY="y-lg" shadow="sm" className={baseClass}>
        <Row align="center" justify="between" gap="sm">
          <Text weight="semibold" className="text-[var(--appkit-color-text)]">{card.label}</Text>
          <Toggle
            checked={isOn}
            disabled={busy || !live}
            ariaLabel={card.label}
            onChange={() => void onToggle(card.toggleId, card.label)}
          />
        </Row>
      </Div>
    );
  }

  // chart — live value comes from the `charts` prop (the caller's own, always-current data), never from the card record itself.
  const liveChart = charts.find((c) => c.chartId === card.chartId);
  return (
    <Div rounded="xl" paddingX="x-lg" paddingY="y-lg" shadow="sm" className={baseClass}>
      <Text size="xs" weight="semibold" className="uppercase tracking-widest text-[var(--appkit-color-text-muted)]">
        {card.label}
      </Text>
      <Text size="2xl" weight="bold" numeric className="mt-2 text-[var(--appkit-color-text)] leading-none">
        {liveChart ? liveChart.value : "—"}
      </Text>
    </Div>
  );
}
