"use client";
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../ui/components/Button";
import { Div } from "../../../ui/components/Div";
import { Icon } from "../../../ui/components/Icon";
import { IconButton } from "../../../ui/components/IconButton";
import { Grid, Row, Stack } from "../../../ui/components/Layout";
import { Input } from "../../../ui/components/Input";
import { Modal } from "../../../ui/components/Modal";
import type { ActionConfirmation } from "../../../_internal/shared/actions/action-registry";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { FieldTextarea } from "../../../ui/forms/FieldTextarea";
import { SURFACE_MAP, type SurfaceKey } from "../../../ui/components/surface-tokens";
import { Span, Text } from "../../../ui/components/Typography";
import { TextLink } from "../../../ui/components/TextLink";
import { Toggle } from "../../../ui/components/Toggle";
import { normalizeError } from "../../../errors/normalize";
import { useToastSafe } from "../../../ui/components/toast-context";
import { rankNavSearchResults, type NavSearchGroupedItem } from "../../shell/searchNavItems";
import { useRecentlyVisited } from "../hooks/useRecentlyVisited";
import { useSavedCards } from "../hooks/useSavedCards";
import type {
  CardElement,
  DashboardCard,
  RecentEntry,
  RecentEntryInput,
} from "../../../_internal/shared/features/dashboard/recent-entry";
import { ROUTES } from "../../../next/routing/route-map";
import { ADMIN_ROW_HREF_BY_RESOURCE, ADMIN_ROW_RESOURCE_LABEL } from "../../../_internal/shared/features/admin/row-widget-resources";

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
  /** Search ranking tiebreaker — see `rankNavSearchResults`'s own doc comment. Absent means 0. */
  priority?: number;
  /**
   * 9K — when set, flipping this toggle from a card/search result shows this
   * confirm dialog first; `onToggle` only fires on confirm. Same
   * `ActionConfirmation` shape Rule #7 requires for destructive `ActionDef`s.
   */
  confirmation?: ActionConfirmation;
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

/**
 * Phase 10 ("widget descriptors") — a `settingPreview` search/card source.
 * READ-ONLY by construction: there is no `onToggle`/write callback here at
 * all, unlike `DashboardQuickJumpToggle`. See `recent-entry.ts`'s doc
 * comment for why this stays separate from the write-capable toggle kind.
 */
export interface DashboardQuickJumpSettingPreview {
  settingId: string;
  label: string;
  /** Live current value, read by the caller — never cached here. */
  value: string;
  href: string;
  keywords?: string[];
  /** Search ranking tiebreaker — see `rankNavSearchResults`'s own doc comment. Absent means 0. */
  priority?: number;
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
  /**
   * Phase 10 — read-only site-settings previews outside `TOGGLE_CATALOG`,
   * searchable the same way toggles/charts are (small, static candidate
   * set). Admin-only in practice; omit elsewhere.
   */
  settingsPreviews?: DashboardQuickJumpSettingPreview[];
  placeholder?: string;
}

type SearchItem =
  | ({ kind: "page"; href: string } & NavSearchGroupedItem)
  | ({ kind: "toggle"; toggleId: string; isOn: boolean; onToggle: () => Promise<void> } & NavSearchGroupedItem)
  | ({ kind: "chart"; chartId: string; value: string | number } & NavSearchGroupedItem)
  | ({ kind: "settingPreview"; settingId: string; value: string; href: string } & NavSearchGroupedItem);

function searchItemKey(item: SearchItem): string {
  if (item.kind === "page") return `page:${item.href}`;
  if (item.kind === "toggle") return `toggle:${item.toggleId}`;
  if (item.kind === "settingPreview") return `settingPreview:${item.settingId}`;
  return `chart:${item.chartId}`;
}

/**
 * Phase 10 — `adminRow`/`productCard`/`pdpSection` are never ranked by
 * search (§4 of the plan's Phase 10 section: their candidate sets are not
 * small/static the way toggles/charts/settingPreviews are). This resolves
 * ONLY the href for a card already in the recency/default list — never
 * called from the search path.
 */
function resolveCardHref(card: RecentEntry | QuickJumpDefaultCard): string | null {
  if (card.kind === "page" || card.kind === "productCard") return card.href;
  if (card.kind === "adminRow") return ADMIN_ROW_HREF_BY_RESOURCE[card.resource]?.(card.rowId) ?? null;
  if (card.kind === "pdpSection") return `${String(ROUTES.PUBLIC.PRODUCT_DETAIL(card.productId))}#section-${card.sectionId}`;
  return null;
}

function cardKey(card: RecentEntry | QuickJumpDefaultCard): string {
  switch (card.kind) {
    case "page":
      return `page:${card.href}`;
    case "toggle":
      return `toggle:${card.toggleId}`;
    case "chart":
      return `chart:${card.chartId}`;
    case "settingPreview":
      return `settingPreview:${card.settingId}`;
    case "adminRow":
      return `adminRow:${card.resource}:${card.rowId}`;
    case "productCard":
      return `productCard:${card.productId}`;
    case "pdpSection":
      return `pdpSection:${card.productId}:${card.sectionId}`;
  }
}

export function DashboardQuickJump({
  scope,
  groups,
  defaultCards,
  toggles = [],
  charts = [],
  settingsPreviews = [],
  placeholder = "What do you want to do?",
}: DashboardQuickJumpProps) {
  const { items: recentItems, recordVisit } = useRecentlyVisited(scope);
  const { items: savedItems, saveFromRecent, removeCard, updateCard } = useSavedCards(scope);
  const toast = useToastSafe();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const savedIds = useMemo(() => new Set(savedItems.map((c) => c.id)), [savedItems]);
  // 9K — a toggle carrying a `confirmation` parks here instead of firing
  // immediately; the shared modal rendered at the bottom of this component
  // resolves it on confirm/cancel. One piece of state serves all 3 toggle
  // surfaces (search results, recent/default cards, saved cards) rather than
  // duplicating the dialog three times.
  const [pendingConfirm, setPendingConfirm] = useState<
    { confirmation: ActionConfirmation; toggleId: string; label: string } | null
  >(null);

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
      priority: t.priority,
    }));
    const chartItems: SearchItem[] = charts.map((c) => ({
      kind: "chart" as const,
      chartId: c.chartId,
      label: c.label,
      keywords: c.keywords,
      value: c.value,
      groupTitle: "Stats",
    }));
    const settingPreviewItems: SearchItem[] = settingsPreviews.map((s) => ({
      kind: "settingPreview" as const,
      settingId: s.settingId,
      label: s.label,
      keywords: s.keywords,
      value: s.value,
      href: s.href,
      groupTitle: "Settings",
      priority: s.priority,
    }));
    return [...pageItems, ...toggleItems, ...chartItems, ...settingPreviewItems];
  }, [groups, toggles, charts, settingsPreviews]);

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

  /**
   * 9K's actual gate — every toggle call site goes through THIS, never
   * `runToggle` directly. A toggle with no `confirmation` behaves exactly as
   * before (fires immediately); one that carries `confirmation` parks the
   * request and opens the shared modal instead.
   */
  async function requestToggle(toggleId: string, label: string) {
    const toggle = toggles.find((t) => t.toggleId === toggleId);
    if (toggle?.confirmation) {
      setPendingConfirm({ confirmation: toggle.confirmation, toggleId, label });
      return;
    }
    await runToggle(toggleId, label);
  }

  async function confirmPendingToggle() {
    if (!pendingConfirm) return;
    const { toggleId, label } = pendingConfirm;
    setPendingConfirm(null);
    await runToggle(toggleId, label);
  }

  function saveCard(card: RecentEntry | QuickJumpDefaultCard) {
    const entry: RecentEntry = "visitedAt" in card ? card : { ...card, visitedAt: new Date().toISOString() };
    saveFromRecent(entry);
    toast?.showToast(`Saved "${card.label}" to your dashboard.`, "success");
  }

  function selectResult(item: SearchItem) {
    if (item.kind === "page") {
      recordVisit({ kind: "page", href: item.href, label: item.label });
      return;
    }
    if (item.kind === "toggle") {
      void requestToggle(item.toggleId, item.label);
      return;
    }
    if (item.kind === "settingPreview") {
      recordVisit({ kind: "settingPreview", settingId: item.settingId, label: item.label });
      return;
    }
    recordVisit({ kind: "chart", chartId: item.chartId, label: item.label });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const top = results[0];
    if (!top) return;
    if (top.kind === "page" || top.kind === "settingPreview") {
      e.preventDefault();
      recordVisit(
        top.kind === "page"
          ? { kind: "page", href: top.href, label: top.label }
          : { kind: "settingPreview", settingId: top.settingId, label: top.label },
      );
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
        <>
          <Grid cols="cards" gap="md">
            {cards.map((card) => (
              <QuickJumpCard
                key={cardKey(card)}
                card={card}
                toggles={toggles}
                charts={charts}
                settingsPreviews={settingsPreviews}
                busy={card.kind === "toggle" && togglingId === card.toggleId}
                isSaved={savedIds.has(cardKey(card))}
                onToggle={requestToggle}
                onSave={() => saveCard(card)}
              />
            ))}
          </Grid>
          {savedItems.length > 0 && (
            <Stack gap="sm">
              <Span size="xs" weight="semibold" color="muted" className="uppercase tracking-widest">
                Saved
              </Span>
              <Grid cols="cards" gap="md">
                {savedItems.map((card) => (
                  <SavedQuickJumpCard
                    key={card.id}
                    card={card}
                    toggles={toggles}
                    charts={charts}
                    settingsPreviews={settingsPreviews}
                    onToggle={requestToggle}
                    onRemove={() => removeCard(card.id)}
                    onUpdate={(patch) => updateCard(card.id, patch)}
                  />
                ))}
              </Grid>
            </Stack>
          )}
        </>
      )}
      {pendingConfirm && (
        <Modal
          isOpen
          onClose={() => setPendingConfirm(null)}
          title={pendingConfirm.confirmation.title}
          actions={
            <Row gap="sm" justify="end">
              <Button variant="ghost" type="button" onClick={() => setPendingConfirm(null)}>
                {pendingConfirm.confirmation.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                variant={pendingConfirm.confirmation.confirmKind === "danger" ? "danger" : "primary"}
                type="button"
                onClick={() => void confirmPendingToggle()}
              >
                {pendingConfirm.confirmation.confirmLabel}
              </Button>
            </Row>
          }
        >
          <Text size="sm">{pendingConfirm.confirmation.body}</Text>
        </Modal>
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
  if (item.kind === "page" || item.kind === "settingPreview") {
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
          <Span size="xs" color="muted">
            {item.kind === "settingPreview" ? item.value : item.groupTitle}
          </Span>
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
  settingsPreviews,
  busy,
  isSaved,
  onToggle,
  onSave,
}: {
  card: RecentEntry | QuickJumpDefaultCard;
  toggles: DashboardQuickJumpToggle[];
  charts: DashboardQuickJumpChart[];
  settingsPreviews: DashboardQuickJumpSettingPreview[];
  busy: boolean;
  isSaved: boolean;
  onToggle: (toggleId: string, label: string) => Promise<void>;
  onSave: () => void;
}) {
  const baseClass =
    "border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] hover:border-[var(--appkit-color-primary)] transition-all";

  /*
   * Phase 10 — `adminRow`/`productCard`/`pdpSection` render identically to
   * `page`: a bookmark (label + link), no live column/badge/price/stock
   * preview. This is the named escape hatch from the plan's Phase 10
   * section, not an oversight — each source system is too structurally
   * different from the dashboard's own data to mirror live.
   */
  let cardBody: ReactNode;
  if (card.kind === "page" || card.kind === "adminRow" || card.kind === "productCard" || card.kind === "pdpSection") {
    const href = resolveCardHref(card);
    if (!href) return null;
    cardBody = (
      <TextLink
        variant="bare"
        href={href}
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
        {card.kind === "adminRow" && (
          <Text size="xs" color="muted">{ADMIN_ROW_RESOURCE_LABEL[card.resource]}</Text>
        )}
      </TextLink>
    );
  } else if (card.kind === "settingPreview") {
    // Live value comes from the `settingsPreviews` prop (the caller's own, always-current data), never from the card record itself.
    const live = settingsPreviews.find((s) => s.settingId === card.settingId);
    cardBody = (
      <TextLink
        variant="bare"
        href={live?.href ?? "#"}
        rounded="xl"
        layout="flex-col"
        gap="sm"
        paddingX="lg"
        paddingY="lg"
        shadow="hover-md"
        className={`group ${baseClass}`}
      >
        <Text size="xs" weight="semibold" className="uppercase tracking-widest text-[var(--appkit-color-text-muted)]">
          {card.label}
        </Text>
        <Text weight="bold" className="text-[var(--appkit-color-text)] group-hover:text-[var(--appkit-color-primary)] transition-colors">
          {live ? live.value : "—"}
        </Text>
      </TextLink>
    );
  } else if (card.kind === "toggle") {
    // Live state comes from the `toggles` prop (the caller's own, always-current data), never from the card record itself.
    const live = toggles.find((t) => t.toggleId === card.toggleId);
    const isOn = live?.isOn ?? false;
    cardBody = (
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
  } else {
    // chart — live value comes from the `charts` prop (the caller's own, always-current data), never from the card record itself.
    const liveChart = charts.find((c) => c.chartId === card.chartId);
    cardBody = (
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

  /*
   * Phase 9-ii (9G's remaining client piece) — "Save" promotes a recent/
   * default card into the user-curated, uncapped `savedCards` tier. Rendered
   * as a SIBLING of the card's own link/toggle, never nested inside —
   * a `<button>` inside an `<a>` is invalid HTML that browsers resolve by
   * closing the anchor early, breaking the CARD's navigation rather than
   * just the button's (same reasoning as `BlogFeaturedCard`'s owner-actions
   * placement). Hidden once already saved — no "unsave from here" affordance
   * yet; that's the saved-card list's own remove button (below).
   */
  return (
    <Div className="relative h-full">
      {cardBody}
      {!isSaved && (
        <IconButton
          aria-label={`Save "${card.label}" to your dashboard`}
          icon={<Icon name="save" size="sm" />}
          size="sm"
          variant="ghost"
          rounded="full"
          className="absolute right-2 top-2 z-10 bg-[var(--appkit-color-surface)]/90 backdrop-blur-sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSave();
          }}
        />
      )}
    </Div>
  );
}

/**
 * 9H's color picker — a small, curated subset of `SURFACE_MAP`
 * (`appkit/src/ui/components/surface-tokens.ts`), never a raw hex. The full
 * map also has structural variants (`glass`, `interactive`, `elevated`, …)
 * that don't mean anything as a card ACCENT — this is the "which tint"
 * subset, same discipline as `DashboardCard.color`'s own doc comment ("a
 * token key into the same surface-tokens.ts map... never a raw hex").
 */
const CARD_COLOR_OPTIONS: SurfaceKey[] = [
  "default",
  "muted",
  "success-surface",
  "warning-surface",
  "danger-surface",
  "info-surface",
];

function resolveCardColor(color: string | undefined): SurfaceKey | undefined {
  return color && (CARD_COLOR_OPTIONS as string[]).includes(color) ? (color as SurfaceKey) : undefined;
}

/** `text` is the one `CardElement` kind with no `label` (free prose has no identity to label). */
function elementDisplayLabel(el: CardElement | undefined): string {
  if (!el) return "card";
  return el.kind === "text" ? "card" : el.label;
}

function SavedQuickJumpCard({
  card,
  toggles,
  charts,
  settingsPreviews,
  onToggle,
  onRemove,
  onUpdate,
}: {
  card: DashboardCard;
  toggles: DashboardQuickJumpToggle[];
  charts: DashboardQuickJumpChart[];
  settingsPreviews: DashboardQuickJumpSettingPreview[];
  onToggle: (toggleId: string, label: string) => Promise<void>;
  onRemove: () => void;
  onUpdate: (patch: Partial<Pick<DashboardCard, "title" | "color" | "elements">>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const baseClass =
    "border border-[var(--appkit-color-border)] hover:border-[var(--appkit-color-primary)] transition-all";
  const colorKey = resolveCardColor(card.color);
  // 9H's composition UI builds elements one at a time (add text, remove any
  // element) — no drag-and-drop, matching the plan's own stated constraint
  // ("no drag-and-drop") for this whole card system.
  const first = card.elements[0];

  return (
    <Div
      rounded="xl"
      paddingX="x-lg"
      paddingY="y-lg"
      shadow="sm"
      surface={colorKey}
      className={`relative ${baseClass} ${colorKey ? "" : "bg-[var(--appkit-color-surface)]"}`}
    >
      {card.title && !editing && (
        <Text size="xs" weight="semibold" className="uppercase tracking-widest text-[var(--appkit-color-text-muted)] mb-2">
          {card.title}
        </Text>
      )}
      {editing ? (
        <SavedCardEditPanel card={card} onUpdate={onUpdate} onDone={() => setEditing(false)} />
      ) : card.elements.length <= 1 && first ? (
        <SavedCardElementBody
          element={first}
          toggles={toggles}
          charts={charts}
          settingsPreviews={settingsPreviews}
          onToggle={onToggle}
        />
      ) : (
        <Stack gap="xs">
          {card.elements.map((el, i) => (
            <SavedCardElementBody
              key={`${el.kind}-${i}`}
              element={el}
              toggles={toggles}
              charts={charts}
              settingsPreviews={settingsPreviews}
              onToggle={onToggle}
            />
          ))}
        </Stack>
      )}
      <Row gap="xs" className="absolute right-2 top-2 z-10">
        <IconButton
          aria-label={editing ? "Stop editing this card" : `Edit "${card.title ?? elementDisplayLabel(first)}"`}
          icon={<Icon name={editing ? "confirm" : "edit"} size="sm" />}
          size="sm"
          variant="ghost"
          rounded="full"
          onClick={() => setEditing((e) => !e)}
        />
        <IconButton
          aria-label={`Remove "${card.title ?? elementDisplayLabel(first)}" from saved`}
          icon={<Icon name="close" size="sm" />}
          size="sm"
          variant="ghost"
          rounded="full"
          onClick={onRemove}
        />
      </Row>
    </Div>
  );
}

function SavedCardEditPanel({
  card,
  onUpdate,
  onDone,
}: {
  card: DashboardCard;
  onUpdate: (patch: Partial<Pick<DashboardCard, "title" | "color" | "elements">>) => void;
  onDone: () => void;
}) {
  function updateElement(index: number, body: string) {
    const next = card.elements.map((el, i) => (i === index && el.kind === "text" ? { ...el, body } : el));
    onUpdate({ elements: next });
  }
  function removeElement(index: number) {
    onUpdate({ elements: card.elements.filter((_, i) => i !== index) });
  }
  function addTextElement() {
    onUpdate({ elements: [...card.elements, { kind: "text", body: "" }] });
  }

  return (
    <Stack gap="sm" className="pr-14">
      <FieldInput
        name={`card-title-${card.id}`}
        label="Title"
        value={card.title ?? ""}
        onChange={(value) => onUpdate({ title: value || undefined })}
      />
      <Div>
        <Text size="xs" weight="semibold" color="muted" className="mb-1">Color</Text>
        <Row gap="xs">
          {CARD_COLOR_OPTIONS.map((key) => (
            <button
              key={key}
              type="button"
              aria-label={`Set card color to ${key}`}
              aria-pressed={card.color === key}
              onClick={() => onUpdate({ color: card.color === key ? undefined : key })}
              className={`h-6 w-6 rounded-full border-2 ${SURFACE_MAP[key] || "bg-[var(--appkit-color-surface)]"} ${
                card.color === key ? "border-[var(--appkit-color-primary)]" : "border-[var(--appkit-color-border)]"
              }`}
            />
          ))}
        </Row>
      </Div>
      <Div>
        <Text size="xs" weight="semibold" color="muted" className="mb-1">Elements</Text>
        <Stack gap="xs">
          {card.elements.map((el, i) =>
            el.kind === "text" ? (
              <Row key={i} gap="xs" align="start">
                <FieldTextarea
                  name={`card-element-${card.id}-${i}`}
                  value={el.body}
                  onChange={(value) => updateElement(i, value)}
                  rows={2}
                  className="flex-1"
                />
                <IconButton
                  aria-label="Remove this element"
                  icon={<Icon name="close" size="sm" />}
                  size="sm"
                  variant="ghost"
                  onClick={() => removeElement(i)}
                />
              </Row>
            ) : (
              <Row key={i} gap="xs" align="center" justify="between">
                <Text size="sm" color="muted">{el.label} ({el.kind})</Text>
                <IconButton
                  aria-label="Remove this element"
                  icon={<Icon name="close" size="sm" />}
                  size="sm"
                  variant="ghost"
                  onClick={() => removeElement(i)}
                />
              </Row>
            ),
          )}
        </Stack>
        <Button variant="ghost" size="sm" type="button" onClick={addTextElement} className="mt-2">
          <Icon name="create" size="sm" /> Add text block
        </Button>
      </Div>
      <Button variant="primary" size="sm" type="button" onClick={onDone}>Done</Button>
    </Stack>
  );
}

function SavedCardElementBody({
  element,
  toggles,
  charts,
  settingsPreviews,
  onToggle,
}: {
  element: CardElement;
  toggles: DashboardQuickJumpToggle[];
  charts: DashboardQuickJumpChart[];
  settingsPreviews: DashboardQuickJumpSettingPreview[];
  onToggle: (toggleId: string, label: string) => Promise<void>;
}) {
  if (element.kind === "toggle") {
    const live = toggles.find((t) => t.toggleId === element.toggleId);
    return (
      <Row align="center" justify="between" gap="sm">
        <Text weight="semibold" className="text-[var(--appkit-color-text)]">{element.label}</Text>
        <Toggle
          checked={live?.isOn ?? false}
          disabled={!live}
          ariaLabel={element.label}
          onChange={() => void onToggle(element.toggleId, element.label)}
        />
      </Row>
    );
  }
  if (element.kind === "chart") {
    const live = charts.find((c) => c.chartId === element.chartId);
    return (
      <Div>
        <Text size="xs" color="muted">{element.label}</Text>
        <Text size="2xl" weight="bold" numeric className="leading-none">
          {live ? live.value : "—"}
        </Text>
      </Div>
    );
  }
  if (element.kind === "settingPreview") {
    const live = settingsPreviews.find((s) => s.settingId === element.settingId);
    return (
      <TextLink variant="bare" href={live?.href ?? "#"}>
        <Text size="xs" color="muted">{element.label}</Text>
        <Text weight="semibold">{live ? live.value : "—"}</Text>
      </TextLink>
    );
  }
  if (element.kind === "text") {
    return <Text size="sm">{element.body}</Text>;
  }
  if (element.kind === "link" || element.kind === "page") {
    return (
      <TextLink variant="bare" href={element.href}>
        <Text weight="semibold">{element.label}</Text>
      </TextLink>
    );
  }
  if (element.kind === "adminRow") {
    const href = ADMIN_ROW_HREF_BY_RESOURCE[element.resource]?.(element.rowId);
    return href ? (
      <TextLink variant="bare" href={href}>
        <Text weight="semibold">{element.label}</Text>
      </TextLink>
    ) : (
      <Text weight="semibold">{element.label}</Text>
    );
  }
  if (element.kind === "productCard") {
    return (
      <TextLink variant="bare" href={element.href}>
        <Text weight="semibold">{element.label}</Text>
      </TextLink>
    );
  }
  if (element.kind === "pdpSection") {
    const href = `${String(ROUTES.PUBLIC.PRODUCT_DETAIL(element.productId))}#section-${element.sectionId}`;
    return (
      <TextLink variant="bare" href={href}>
        <Text weight="semibold">{element.label}</Text>
      </TextLink>
    );
  }
  // "form" (9H's inline quick-edit) has no render target yet — a labeled
  // placeholder rather than silently dropping the element.
  return <Text size="sm" color="muted">{element.label} (form — not yet editable here)</Text>;
}
