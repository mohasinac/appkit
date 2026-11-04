"use client";
import { useState } from "react";
import { z } from "zod";
import { Button, type ButtonProps } from "../../../ui/components/Button";
import { Div } from "../../../ui/components/Div";
import { FormGroup } from "../../../ui/components/Form";
import { Icon } from "../../../ui/components/Icon";
import { IconButton } from "../../../ui/components/IconButton";
import { Row, Stack } from "../../../ui/components/Layout";
import { MediaImage } from "../../../ui/components/MediaImage";
import { QuickFormDrawer, type QuickFieldDef } from "../../shell/QuickFormDrawer";
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
import type { CardElement, CardElementSpan, DashboardCard, FunctionalSlotId } from "../../../_internal/shared/features/dashboard/recent-entry";
import type { ReactNode } from "react";
import { ROUTES } from "../../../next/routing/route-map";
import { ADMIN_ROW_HREF_BY_RESOURCE } from "../../../_internal/shared/features/admin/row-widget-resources";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { apiClient } from "../../../http";
import { FAQ_CATEGORY_LABELS } from "../../faq/schemas/firestore";
import type { FAQCategory } from "../../faq/types";
import { ImageUpload } from "../../media/upload/ImageUpload";
import { useMediaUpload } from "../../media/hooks/useMedia";
import { ROW_COLUMNS, packBySpan } from "../../../utils/pack-by-span";
import { ALL_LISTING_TYPES } from "../../../_internal/shared/listing-types/feature-flags";
import { humaniseFieldName } from "../../shell/entity-form";
import type { FormValues } from "../../../schemas/types";
import { normalizeError } from "../../../errors/normalize";

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
 * The live `ReactNode` a `functionalSlot` element resolves to — supplied by
 * whatever mounts `AdminComposableRegion` for a given surface (the only
 * producer today is `ProductDetailPageView`, via its own `renderOfferAction`
 * closure). Absent/missing key means the composed region is mounted on a
 * surface that doesn't declare this slot (or doesn't currently meet the
 * slot's own eligibility conditions, e.g. offers disabled for this product)
 * — rendered as an honest "not available here" note, never a broken control.
 */
type FunctionalSlotLookup = Partial<Record<FunctionalSlotId, ReactNode>>;

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
 * Whole-card content-tag gate — first cut covers `governs: "listingType"`
 * only (the common case: "hide this widget when collector-drop is
 * disabled"). `categoryType`/`browsePage` tags are real, valid
 * `ContentTag.governs` values too (the server schema accepts all three,
 * `isContentVisible` handles all three) — just not reachable from this
 * picker yet. A card can still be tagged with either via direct API use;
 * widening this `<Select>` to a kind+value pair is a follow-up, not a
 * blocker for the listing-type case this was built for.
 */
const CONTENT_TAG_OPTIONS: SelectOption[] = [
  { value: "", label: "No tag — always visible" },
  ...ALL_LISTING_TYPES.map((t) => ({ value: t, label: humaniseFieldName(t) })),
];

const FAQ_CATEGORY_OPTIONS = (
  Object.entries(FAQ_CATEGORY_LABELS) as Array<[FAQCategory, string]>
).map(([value, label]) => ({ value, label }));

const quickFaqSchema = z.object({
  question: z.string().min(5, "Question must be at least 5 characters"),
  answer: z.string().min(20, "Answer must be at least 20 characters"),
  category: z.string().min(1, "Category is required"),
});

/**
 * `form` CardElement kind registry (2026-11-04) — resolves `formId` to a
 * real, runnable quick-create form. ONE entry, deliberately: the plan's own
 * investigation found every candidate form tied to a specific record except
 * FAQ creation, so adding a second, speculative entry here would repeat the
 * exact "registry almost nothing uses" pattern this codebase already
 * retired once (`route-schema-registry`). Add the next entry when a second
 * real, context-free quick-create need exists — not before.
 */
interface FormWidgetDef {
  title: string;
  fields: QuickFieldDef[];
  schema: z.ZodType<FormValues>;
  submit: (values: FormValues, context?: string) => Promise<void>;
}

const FORM_WIDGET_REGISTRY: Record<string, FormWidgetDef> = {
  "quick-add-faq": {
    title: "Quick add FAQ",
    fields: [
      { name: "question", label: "Question", type: "text", required: true },
      { name: "answer", label: "Answer", type: "textarea", required: true },
      { name: "category", label: "Category", type: "select", required: true, options: FAQ_CATEGORY_OPTIONS },
    ],
    schema: quickFaqSchema as z.ZodType<FormValues>,
    // `context` unused — FAQ creation has no owning store/record. Kept on
    // the signature so every registry entry has the same shape.
    submit: async (values) => {
      await apiClient.post(ADMIN_ENDPOINTS.FAQS, values);
    },
  },
};

/**
 * The `form` CardElement's render target — a button that opens a
 * `QuickFormDrawer` built from the resolved registry entry. Unknown
 * `formId`s (a stale pin from a removed registry entry) render the same
 * honest "not editable here" text the placeholder used, rather than a
 * broken button.
 */
function FormWidgetButton({ formId, label, context }: { formId: string; label: string; context?: string }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToastSafe();
  const widget = FORM_WIDGET_REGISTRY[formId];
  if (!widget) {
    return <Text size="sm" color="muted">{label} (form — unknown formId &ldquo;{formId}&rdquo;)</Text>;
  }
  return (
    <>
      <Button variant="secondary" size="sm" type="button" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <QuickFormDrawer
        isOpen={open}
        onClose={() => setOpen(false)}
        title={widget.title}
        fields={widget.fields}
        schema={widget.schema}
        onSubmit={async (values) => {
          setSubmitting(true);
          try {
            await widget.submit(values, context);
            toast?.showToast(`${widget.title} — saved.`, "success");
            setOpen(false);
          } catch (err) {
            void normalizeError(err);
            toast?.showToast(`Couldn't save "${widget.title}" — please try again.`, "error");
          } finally {
            setSubmitting(false);
          }
        }}
        isLoading={submitting}
      />
    </>
  );
}

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
  onUpdate: (patch: Partial<Pick<DashboardCard, "title" | "color" | "elements" | "spans" | "contentTags">>) => void;
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
  /**
   * Live content for any `functionalSlot` elements this card holds — see
   * `FunctionalSlotLookup`'s own doc comment. Defaults to `{}` (every
   * existing caller predates this kind); a `functionalSlot` element with no
   * matching key renders its "not available here" fallback, never throws.
   */
  functionalSlots?: FunctionalSlotLookup;
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
  functionalSlots = {},
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
          functionalSlots={functionalSlots}
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
                  functionalSlots={functionalSlots}
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
  onUpdate: (patch: Partial<Pick<DashboardCard, "title" | "color" | "elements" | "spans" | "contentTags">>) => void;
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
  function addFormElement() {
    // Single registry entry today (`FORM_WIDGET_REGISTRY`'s own doc
    // comment explains why) — a direct add, not a picker. Widen to a
    // `<Select>` of `formId`s the moment a second entry exists.
    onUpdate({ elements: [...card.elements, { kind: "form", formId: "quick-add-faq", label: "Quick add FAQ" }] });
  }
  function addFunctionalSlotElement() {
    // Same reasoning as `addFormElement` — exactly one `FunctionalSlotId`
    // exists today (`recent-entry.ts`'s own doc comment), so this is a
    // direct add rather than a picker. Widen to a `<Select>` the moment a
    // second slot id exists.
    onUpdate({
      elements: [...card.elements, { kind: "functionalSlot", slotId: "pdp-offer-action", label: "Make an Offer button" }],
    });
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
        <Text size="xs" weight="semibold" color="muted" className="mb-1">Visible when listing type is on</Text>
        <Select
          aria-label="Gate this card by listing type"
          options={CONTENT_TAG_OPTIONS}
          value={card.contentTags?.[0]?.value ?? ""}
          onValueChange={(value) =>
            onUpdate({ contentTags: value ? [{ governs: "listingType", value }] : undefined })
          }
        />
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
                  ) : el.kind === "form" ? (
                    // `formId` stays fixed to the registry entry this was
                    // added as — only the button's own label is editable.
                    // Widen when a second registry entry makes `formId`
                    // itself a real choice.
                    <FieldInput
                      name={`card-element-${card.id}-${i}-label`}
                      label="Button label"
                      value={el.label}
                      onChange={(value) => updateElement(i, { label: value })}
                    />
                  ) : el.kind === "functionalSlot" ? (
                    // `slotId` stays fixed — the admin picks a label only.
                    // What actually renders is entirely developer-wired (see
                    // `recent-entry.ts`'s `functionalSlot` doc comment); this
                    // panel deliberately gives no way to point it at
                    // anything else.
                    <Stack gap="xs">
                      <Text size="xs" color="muted">Functional slot: {el.slotId}</Text>
                      <FieldInput
                        name={`card-element-${card.id}-${i}-label`}
                        label="Label"
                        value={el.label}
                        onChange={(value) => updateElement(i, { label: value })}
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
        <Row gap="xs" wrap padding="t-xs">
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
          <Button variant="ghost" size="sm" type="button" onClick={addFormElement}>
            <Icon name="create" size="sm" /> Quick form
          </Button>
          <Button variant="ghost" size="sm" type="button" onClick={addFunctionalSlotElement}>
            <Icon name="create" size="sm" /> Functional slot
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
  functionalSlots = {},
}: {
  element: CardElement;
  toggles: ToggleLookup[];
  charts: ChartLookup[];
  settingsPreviews: SettingPreviewLookup[];
  onToggle: (toggleId: string, label: string) => Promise<void>;
  functionalSlots?: FunctionalSlotLookup;
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
  if (element.kind === "functionalSlot") {
    const live = functionalSlots[element.slotId];
    return live ? (
      <>{live}</>
    ) : (
      <Text size="sm" color="muted">{element.label} (not available on this page)</Text>
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
   * 🛑 2026-11-04 — the gap this comment used to describe is closed.
   * `FormWidgetButton` resolves `formId` against `FORM_WIDGET_REGISTRY`;
   * the `context` field the old comment named as the missing piece was
   * added to the `CardElement` `form` variant (`recent-entry.ts`) the same
   * pass. See `FORM_WIDGET_REGISTRY`'s own doc comment for why it still
   * has exactly one entry.
   */
  return <FormWidgetButton formId={element.formId} label={element.label} context={element.context} />;
}
