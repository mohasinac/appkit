"use client";
import { useState } from "react";
import { Button, type ButtonProps } from "../../../ui/components/Button";
import { Div } from "../../../ui/components/Div";
import { FormGroup } from "../../../ui/components/Form";
import { Icon } from "../../../ui/components/Icon";
import { IconButton } from "../../../ui/components/IconButton";
import { Row, Stack } from "../../../ui/components/Layout";
import { MediaImage } from "../../../ui/components/MediaImage";
import { RichTextEditor } from "../../../ui/components/RichTextEditor";
import { RichTextRenderer } from "../../../ui/rich-text/RichTextRenderer";
import { Select, type SelectOption } from "../../../ui/components/Select";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { FieldTextarea } from "../../../ui/forms/FieldTextarea";
import { SURFACE_MAP, type SurfaceKey } from "../../../ui/components/surface-tokens";
import { Text } from "../../../ui/components/Typography";
import { TextLink } from "../../../ui/components/TextLink";
import { Toggle } from "../../../ui/components/Toggle";
import { useToastSafe } from "../../../ui/components/toast-context";
import type { CardElement, CardElementSpan, DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";
import { ROUTES } from "../../../next/routing/route-map";
import { ADMIN_ROW_HREF_BY_RESOURCE } from "../../../_internal/shared/features/admin/row-widget-resources";
import { ImageUpload } from "../../media/upload/ImageUpload";
import { useMediaUpload } from "../../media/hooks/useMedia";
import { ROW_COLUMNS, packBySpan } from "../../../utils/pack-by-span";

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

/**
 * The real, closed `UI_BUTTON.variants` keys (`Button.tsx`) — hand-listed
 * rather than imported, since that map is module-private inside a `"use
 * client"` component this shared card-rendering module already imports
 * `Button` from directly (so the KEYS are a safe hand-copy, not a new
 * dependency).
 *
 * 🛑 THREE copies exist, not two — found by review 2026-11-03. Both
 * `page-regions/[pageId]/route.ts` AND `user/profile/route.ts` spell the
 * same 7 values out again in their own `cardElementSchema`'s `cta.variant`
 * enum (neither can import `Button.tsx`). If a variant is ever added to
 * `Button.tsx`, update all THREE, not "the other place."
 */
const CTA_VARIANT_OPTIONS: SelectOption[] = [
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "outline", label: "Outline" },
  { value: "ghost", label: "Ghost" },
  { value: "danger", label: "Danger" },
  { value: "warning", label: "Warning" },
  { value: "inverse", label: "Inverse (on dark/branded background)" },
];

/**
 * The discrete, breakpoint-driven resize control — owner's instruction:
 * "the resize should be in breakpoints not on stretching as per needs".
 * Same 4 values `field-ui-meta.ts`'s `FieldRow` uses for form fields, picked
 * from a `<Select>`, never a drag handle or a continuous slider.
 */
const SPAN_OPTIONS: SelectOption[] = [
  { value: "full", label: "Full width" },
  { value: "pair", label: "Half (2 per row)" },
  { value: "third", label: "Third (3 per row)" },
  { value: "quarter", label: "Quarter (4 per row)" },
];

/**
 * `text`/`image`/`richText` carry no REQUIRED label (free prose, and a
 * media/rich-text block whose label is purely decorative) — falls back to
 * "card" rather than rendering `undefined` in an aria-label.
 */
function elementDisplayLabel(el: CardElement | undefined): string {
  if (!el) return "card";
  if (el.kind === "text" || el.kind === "image" || el.kind === "richText") {
    return ("label" in el ? el.label : undefined) || "card";
  }
  return el.label;
}

export interface DashboardCardViewProps {
  card: DashboardCard;
  toggles: ToggleLookup[];
  charts: ChartLookup[];
  settingsPreviews: SettingPreviewLookup[];
  onToggle: (toggleId: string, label: string) => Promise<void>;
  onRemove: () => void;
  onUpdate: (patch: Partial<Pick<DashboardCard, "title" | "color" | "elements" | "spans">>) => void;
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
        // Packed by span, breakpoint-driven — full width on mobile, N-up
        // from `sm`/`lg` via `<FormGroup columns>` (the exact mechanism
        // `build-sections.tsx`'s `packRows` already uses for form fields;
        // see `pack-by-span.ts`'s own doc comment for why this is a
        // deliberate, flagged second copy rather than a shared import).
        // Elements with no stored span default to `"full"` — identical to
        // the single vertical stack every card rendered before spans
        // existed.
        <Stack gap="xs">
          {packBySpan(
            card.elements.map((el, i) => ({ el, i })),
            ({ i }) => card.spans?.[String(i)],
          ).map((row, rowIndex) => (
            <FormGroup key={`row-${rowIndex}`} columns={ROW_COLUMNS[card.spans?.[String(row[0].i)] ?? "full"]} gap="sm">
              {row.map(({ el, i }) => (
                <DashboardCardElementBody
                  key={`${el.kind}-${i}`}
                  element={el}
                  toggles={toggles}
                  charts={charts}
                  settingsPreviews={settingsPreviews}
                  onToggle={onToggle}
                />
              ))}
            </FormGroup>
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
  onUpdate: (patch: Partial<Pick<DashboardCard, "title" | "color" | "elements" | "spans">>) => void;
  onDone: () => void;
}) {
  const toast = useToastSafe();
  const { upload } = useMediaUpload();
  // Tracks which element indices have an upload in flight — NOT local-only
  // state that would be lost on unmount: `onUpdate`/`onDone` both close over
  // the parent's own `setCards`, which stays mounted while only this panel
  // unmounts, so an upload that resolves after "Done" is clicked still
  // lands correctly. This exists purely so "Done" can be disabled with
  // visible feedback while an upload is running, rather than for
  // correctness.
  const [uploadingIndices, setUploadingIndices] = useState<Set<number>>(new Set());
  const isUploading = uploadingIndices.size > 0;

  function updateElement(index: number, patch: Partial<CardElement>) {
    const next = card.elements.map((el, i) => (i === index ? ({ ...el, ...patch } as CardElement) : el));
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
    // Reindexing: a span keyed to an index above the removed one would now
    // point at the wrong element. Simplest correct fix is to drop every
    // stored span and let elements fall back to "full" — a card composed
    // by hand rarely has more than a few elements, so re-picking spans
    // after a removal is a small cost for never silently mis-sizing an
    // unrelated element.
    if (card.spans) onUpdate({ spans: {} });
  }
  function setElementSpan(index: number, span: CardElementSpan) {
    const next = { ...(card.spans ?? {}) };
    if (span === "full") delete next[String(index)];
    else next[String(index)] = span;
    onUpdate({ spans: next });
  }
  function addTextElement() {
    onUpdate({ elements: [...card.elements, { kind: "text", body: "" }] });
  }
  function addRichTextElement() {
    onUpdate({ elements: [...card.elements, { kind: "richText", html: "" }] });
  }
  function addCtaElement() {
    onUpdate({ elements: [...card.elements, { kind: "cta", href: "", label: "" }] });
  }
  function addImageElement() {
    // Empty placeholder first — the admin picks the file from the
    // `ImageUpload` control that appears once this element exists, rather
    // than a file picker opening as a side effect of this click.
    onUpdate({ elements: [...card.elements, { kind: "image", mediaUrl: "", alt: "" }] });
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
        <Stack gap="sm">
          {card.elements.map((el, i) => (
            <Div key={i} rounded="md" border="default" padding="sm">
              <Row gap="xs" align="start" justify="between">
                <Div className="flex-1">
                  {el.kind === "text" ? (
                    <FieldTextarea
                      name={`card-element-${card.id}-${i}`}
                      value={el.body}
                      onChange={(value) => updateElement(i, { body: value })}
                      rows={2}
                    />
                  ) : el.kind === "richText" ? (
                    <RichTextEditor
                      value={el.html}
                      onChange={(value) => updateElement(i, { html: value })}
                      placeholder="Rich text…"
                      minHeightClassName="min-h-[80px]"
                    />
                  ) : el.kind === "image" ? (
                    <Stack gap="xs">
                      <ImageUpload
                        currentImage={el.mediaUrl}
                        label="Image"
                        onUpload={async (file) => {
                          setUploadingIndices((prev) => new Set(prev).add(i));
                          try {
                            return await upload(file, "dashboard-cards");
                          } finally {
                            setUploadingIndices((prev) => {
                              const next = new Set(prev);
                              next.delete(i);
                              return next;
                            });
                          }
                        }}
                        onChange={(url) => updateElement(i, { mediaUrl: url })}
                      />
                      <FieldInput
                        name={`card-element-${card.id}-${i}-alt`}
                        label="Alt text"
                        value={el.alt}
                        onChange={(value) => updateElement(i, { alt: value })}
                      />
                    </Stack>
                  ) : el.kind === "cta" ? (
                    <Stack gap="xs">
                      <FieldInput
                        name={`card-element-${card.id}-${i}-label`}
                        label="Button label"
                        value={el.label}
                        onChange={(value) => updateElement(i, { label: value })}
                      />
                      <FieldInput
                        name={`card-element-${card.id}-${i}-href`}
                        label="Link"
                        value={el.href}
                        onChange={(value) => updateElement(i, { href: value })}
                      />
                      <Select
                        aria-label="Button style"
                        options={CTA_VARIANT_OPTIONS}
                        value={el.variant ?? "primary"}
                        onValueChange={(value) => updateElement(i, { variant: value })}
                      />
                    </Stack>
                  ) : (
                    <Text size="sm" color="muted">{el.label} ({el.kind})</Text>
                  )}
                  <Row gap="xs" align="center" className="mt-2">
                    <Text size="xs" color="muted">Width:</Text>
                    <Select
                      aria-label="Element width"
                      options={SPAN_OPTIONS}
                      value={card.spans?.[String(i)] ?? "full"}
                      onValueChange={(value) => setElementSpan(i, value as CardElementSpan)}
                      className="text-xs"
                    />
                  </Row>
                </Div>
                <IconButton
                  aria-label="Remove this element"
                  icon={<Icon name="close" size="sm" />}
                  size="sm"
                  variant="ghost"
                  disabled={card.elements.length <= 1}
                  onClick={() => removeElement(i)}
                />
              </Row>
            </Div>
          ))}
        </Stack>
        <Row gap="xs" className="mt-2 flex-wrap">
          <Button variant="ghost" size="sm" type="button" onClick={addTextElement}>
            <Icon name="create" size="sm" /> Text
          </Button>
          <Button variant="ghost" size="sm" type="button" onClick={addRichTextElement}>
            <Icon name="create" size="sm" /> Rich text
          </Button>
          <Button variant="ghost" size="sm" type="button" onClick={addImageElement}>
            <Icon name="create" size="sm" /> Image
          </Button>
          <Button variant="ghost" size="sm" type="button" onClick={addCtaElement}>
            <Icon name="create" size="sm" /> Button
          </Button>
        </Row>
      </Div>
      {isUploading && (
        <Text size="xs" color="muted">Uploading image… this card will keep saving once it finishes.</Text>
      )}
      <Button variant="primary" size="sm" type="button" onClick={onDone} disabled={isUploading}>
        Done
      </Button>
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
  if (element.kind === "image") {
    const img = (
      <MediaImage src={element.mediaUrl} alt={element.alt} size="card" className="w-full" />
    );
    return element.href ? <TextLink variant="bare" href={element.href}>{img}</TextLink> : img;
  }
  if (element.kind === "richText") {
    // `charts={false}` deliberately — this renderer has no chart data
    // source wired in, so the chart-block feature must not be silently
    // inherited from the shared `RichTextRenderer`.
    return <RichTextRenderer html={element.html} charts={false} />;
  }
  if (element.kind === "cta") {
    return (
      <Button variant={(element.variant as ButtonProps["variant"]) ?? "primary"} asChild>
        <TextLink variant="bare" href={element.href}>{element.label}</TextLink>
      </Button>
    );
  }
  /*
   * 🛑 "form" (9H's inline quick-edit) still has no render target — NOT
   * extended in the same pass as `image`/`richText`/`cta`, on purpose.
   * Investigated 2026-11-03: the plan's own proposal (express
   * `QuickProductForm`'s field set as `QuickFieldDef[]`, resolved by a
   * `formId` registry) runs into two real gaps, not a quick wire-up —
   *
   * 1. `QuickFieldDef`/`QuickFormDrawer` had no `"image"` field type at all
   *    (fixed here — see `ui/types/quick-field.ts`'s updated doc comment —
   *    but `QuickFormDrawer`'s own field loop still doesn't render it; only
   *    a NEW inline renderer would).
   * 2. Every real short form that already exists in this codebase
   *    (`QuickProductForm`, `SellerOffersView`'s counter-offer drawer) is
   *    tied to a specific record/store the bare `{kind:"form"; formId;
   *    label}` shape has nowhere to carry — "which store does a pinned
   *    quick-create-product widget create under" has no answer from a
   *    formId string alone. Building a registry now would mean inventing a
   *    fake, speculative first entry with no real consumer, which is the
   *    exact "registry almost nothing uses" pattern this codebase already
   *    retired once (`route-schema-registry`). Left as the honest
   *    placeholder below until a real, genuinely context-free quick form
   *    exists, or the `CardElement` `form` variant gains a `context`
   *    field to carry a store/record id.
   */
  return <Text size="sm" color="muted">{element.label} (form — not yet editable here)</Text>;
}
