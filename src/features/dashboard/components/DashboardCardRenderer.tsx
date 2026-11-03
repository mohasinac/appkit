"use client";
import { useState } from "react";
import { Button } from "../../../ui/components/Button";
import { Div } from "../../../ui/components/Div";
import { Icon } from "../../../ui/components/Icon";
import { IconButton } from "../../../ui/components/IconButton";
import { Row, Stack } from "../../../ui/components/Layout";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { FieldTextarea } from "../../../ui/forms/FieldTextarea";
import { SURFACE_MAP, type SurfaceKey } from "../../../ui/components/surface-tokens";
import { Text } from "../../../ui/components/Typography";
import { TextLink } from "../../../ui/components/TextLink";
import { Toggle } from "../../../ui/components/Toggle";
import { useToastSafe } from "../../../ui/components/toast-context";
import type { CardElement, DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";
import { ROUTES } from "../../../next/routing/route-map";
import { ADMIN_ROW_HREF_BY_RESOURCE } from "../../../_internal/shared/features/admin/row-widget-resources";

/**
 * Extracted from `DashboardQuickJump.tsx` (Phase 3B) — the card
 * rendering/editing UI was already storage-agnostic (every component here
 * takes `card`/`element` + an `onUpdate`/`onToggle` callback, never reaching
 * into a hook itself), so it had exactly two real consumers the moment a
 * second one existed: the per-user dashboard's saved-cards grid, and 3B's
 * admin-composable PAGE regions (shared, not per-user — see
 * `page-regions.ts`'s own doc comment for why that's a different storage
 * layer, not a different rendering one). Same prop surface, same shape —
 * the Duplication Decision Framework's case for consolidating on sight
 * rather than waiting for a third copy.
 *
 * Narrow lookup types below (`ToggleLookup` etc.) intentionally do NOT
 * import `DashboardQuickJumpToggle`/`Chart`/`SettingPreview` from
 * `DashboardQuickJump.tsx` — those carry search-specific fields
 * (`keywords`, `priority`, `confirmation`) this module has no reason to
 * know about, and importing them would make this file depend on the one
 * file that now depends on IT. Structural typing makes the fuller
 * interfaces assignable here with no cast needed.
 */

interface ToggleLookup {
  toggleId: string;
  isOn: boolean;
}
interface ChartLookup {
  chartId: string;
  value: string | number;
}
interface SettingPreviewLookup {
  settingId: string;
  value: string;
  href: string;
}

/**
 * 9H's color picker — a small, curated subset of `SURFACE_MAP`, never a raw
 * hex. The full map also has structural variants (`glass`, `interactive`,
 * `elevated`, …) that don't mean anything as a card ACCENT.
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

export interface DashboardCardViewProps {
  card: DashboardCard;
  toggles: ToggleLookup[];
  charts: ChartLookup[];
  settingsPreviews: SettingPreviewLookup[];
  onToggle: (toggleId: string, label: string) => Promise<void>;
  onRemove: () => void;
  onUpdate: (patch: Partial<Pick<DashboardCard, "title" | "color" | "elements">>) => void;
  /**
   * Defaults `true` (the per-user "Saved" grid's existing behavior, always
   * editable by the user it belongs to — unchanged by this prop's
   * addition). `AdminComposableRegion` (Phase 3B) passes the viewer's
   * `editMode` state explicitly, since a SHARED page region must show zero
   * edit chrome to anyone not currently in edit mode — not even an admin
   * who hasn't flipped the toggle, matching Phase 3's own "off, the admin
   * sees exactly what a buyer/seller sees" guarantee.
   */
  editable?: boolean;
}

export function DashboardCardView({
  card,
  toggles,
  charts,
  settingsPreviews,
  onToggle,
  onRemove,
  onUpdate,
  editable = true,
}: DashboardCardViewProps) {
  const [editing, setEditing] = useState(false);
  const baseClass =
    "border border-[var(--appkit-color-border)] hover:border-[var(--appkit-color-primary)] transition-all";
  const colorKey = resolveCardColor(card.color);
  // 9H's composition UI builds elements one at a time (add text, remove any
  // element) — no drag-and-drop, matching the plan's own stated constraint
  // ("no drag-and-drop") for this whole card system.
  const first = card.elements[0];
  const isEditing = editable && editing;

  return (
    <Div
      rounded="xl"
      paddingX="x-lg"
      paddingY="y-lg"
      shadow="sm"
      surface={colorKey}
      className={`relative ${baseClass} ${colorKey ? "" : "bg-[var(--appkit-color-surface)]"}`}
    >
      {card.title && !isEditing && (
        <Text size="xs" weight="semibold" className="uppercase tracking-widest text-[var(--appkit-color-text-muted)] mb-2">
          {card.title}
        </Text>
      )}
      {isEditing ? (
        <DashboardCardEditPanel card={card} onUpdate={onUpdate} onDone={() => setEditing(false)} />
      ) : card.elements.length <= 1 && first ? (
        <DashboardCardElementBody
          element={first}
          toggles={toggles}
          charts={charts}
          settingsPreviews={settingsPreviews}
          onToggle={onToggle}
        />
      ) : (
        <Stack gap="xs">
          {card.elements.map((el, i) => (
            <DashboardCardElementBody
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
      {editable && (
      <Row gap="xs" className="absolute right-2 top-2 z-10">
        <IconButton
          aria-label={isEditing ? "Stop editing this card" : `Edit "${card.title ?? elementDisplayLabel(first)}"`}
          icon={<Icon name={isEditing ? "confirm" : "edit"} size="sm" />}
          size="sm"
          variant="ghost"
          rounded="full"
          onClick={() => setEditing((e) => !e)}
        />
        <IconButton
          aria-label={`Remove "${card.title ?? elementDisplayLabel(first)}"`}
          icon={<Icon name="close" size="sm" />}
          size="sm"
          variant="ghost"
          rounded="full"
          onClick={onRemove}
        />
      </Row>
      )}
    </Div>
  );
}

function DashboardCardEditPanel({
  card,
  onUpdate,
  onDone,
}: {
  card: DashboardCard;
  onUpdate: (patch: Partial<Pick<DashboardCard, "title" | "color" | "elements">>) => void;
  onDone: () => void;
}) {
  const toast = useToastSafe();

  function updateElement(index: number, body: string) {
    const next = card.elements.map((el, i) => (i === index && el.kind === "text" ? { ...el, body } : el));
    onUpdate({ elements: next });
  }
  /*
   * 🛑 A card's `elements` array is server-validated `.min(1)` (the route's
   * own Zod schema — confirmed by negative control when that schema was
   * built). Letting the last element go to 0 here isn't caught until the
   * debounced PATCH 400s 600ms later, with no rollback and no specific
   * error — the edit just silently reverts on next load. Refusing the
   * client-side action is the correct fix, not a server-side message.
   */
  function removeElement(index: number) {
    if (card.elements.length <= 1) {
      toast?.showToast("A card needs at least one element — add another before removing this one.", "info");
      return;
    }
    onUpdate({ elements: card.elements.filter((_, i) => i !== index) });
  }
  function addTextElement() {
    onUpdate({ elements: [...card.elements, { kind: "text", body: "" }] });
  }

  return (
    <Stack gap="sm" padding="r-xl">
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
            <IconButton
              key={key}
              aria-label={`Set card color to ${key}`}
              aria-pressed={card.color === key}
              onClick={() => onUpdate({ color: card.color === key ? undefined : key })}
              rounded="full"
              className={`h-6 w-6 min-h-0 min-w-0 border-2 ${SURFACE_MAP[key] || "bg-[var(--appkit-color-surface)]"} ${
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
                  disabled={card.elements.length <= 1}
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
                  disabled={card.elements.length <= 1}
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

function DashboardCardElementBody({
  element,
  toggles,
  charts,
  settingsPreviews,
  onToggle,
}: {
  element: CardElement;
  toggles: ToggleLookup[];
  charts: ChartLookup[];
  settingsPreviews: SettingPreviewLookup[];
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
