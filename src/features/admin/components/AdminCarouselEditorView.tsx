"use client";

import { useApiMutation } from "@mohasinac/appkit/client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Alert, Button, ConfirmDeleteModal, Div, Form, FormActions, Heading, Input, Row, Select, Stack, StackedViewShell, Tabs, TabsContent, TabsList, TabsTrigger, Text, Toggle } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { FieldInput, FormShellContext, useFormShellState } from "../../../ui/forms";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";

const __P = {
  p3: "p-3",
} as const;

const CLS_PANEL = "rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 space-y-3";
const CLS_ROW_BETWEEN = "flex items-center justify-between";
const CLS_SECTION_HEADING = "text-sm font-semibold text-zinc-900 dark:text-zinc-100";

import type {
  CarouselBackground,
  CarouselCard,
  CarouselSlideHeight,
  CarouselHoverEffect,
} from "../../homepage/schemas/firestore";

const carouselSlideSchema = z.object({
  title: z.string().min(1, "Slide title is required").max(150),
  order: z.number().int().min(0),
  active: z.boolean(),
}).passthrough();

export interface AdminCarouselEditorViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  slideId?: string;
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
  onCancel?: () => void;
}

// ── helpers ─────────────────────────────────────────────────────────────────

function makeCard(zone: 1 | 2 | 3 | 4 | 5 | 6 = 1): CarouselCard {
  return {
    id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    zone,
    background: { type: "color", color: "var(--appkit-color-primary)" },
    // audit-hex-tokens-ok: default white text on colored bg — written into Firestore card
    content: { title: "", subtitle: "", textColor: "#ffffff", textAlign: "left" },
    buttons: [],
    hover: { effect: "scale" },
  };
}

function makeButton() {
  return { id: `btn-${Date.now()}`, text: "", href: "", variant: "primary" as const, openInNewTab: false };
}

const HEIGHT_OPTIONS = [
  { value: "tall", label: "Tall (80vh)" },
  { value: "medium", label: "Medium (60vh)" },
  { value: "viewport", label: "Full viewport (100vh)" },
];

const BG_TYPE_OPTIONS = [
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "color", label: "Solid colour" },
  { value: "gradient", label: "Gradient" },
];

const HOVER_OPTIONS = [
  { value: "none", label: "None" },
  { value: "scale", label: "Scale up" },
  { value: "glow", label: "Glow" },
  { value: "color", label: "Colour shift" },
];

const VARIANT_OPTIONS = [
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "outline", label: "Outline" },
  { value: "ghost", label: "Ghost" },
  { value: "link", label: "Link" },
];

const TEXT_ALIGN_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

// ── Zone Picker ──────────────────────────────────────────────────────────────

function ZonePicker({
  selected,
  onChange,
  disabled,
}: {
  selected: 1 | 2 | 3 | 4 | 5 | 6;
  onChange: (z: 1 | 2 | 3 | 4 | 5 | 6) => void;
  disabled?: (z: 1 | 2 | 3 | 4 | 5 | 6) => boolean;
}) {
  const zones = [1, 2, 3, 4, 5, 6] as const;
  return (
    <Div>
      <Text className="mb-1" color="muted" size="xs">Zone (row × col grid)</Text>
      <div
        className="grid gap-1"
        // audit-inline-style-ok: dynamic CSS
        style={{ gridTemplateRows: "repeat(2, 1fr)", gridTemplateColumns: "repeat(3, 1fr)", width: 150 }}
      >
        {zones.map((z) => {
          const isDisabled = disabled?.(z) ?? false;
          return (
            <button
              key={z}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onChange(z)}
              className={`rounded text-xs font-mono py-2 border transition-colors ${
                selected === z
                  ? "bg-primary text-white border-primary"
                  : isDisabled
                  ? "bg-zinc-100 text-zinc-300 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 cursor-not-allowed"
                  : "bg-white border-zinc-300 text-zinc-700 hover:border-primary dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-200"
              }`}
            >
              {z}
            </button>
          );
        })}
      </div>
      <Text className="text-[10px] mt-1" color="faint">Row 1 = zones 1–3 · Row 2 = zones 4–6</Text>
    </Div>
  );
}

// ── Background Editor ────────────────────────────────────────────────────────

function BackgroundEditor({
  value,
  onChange,
  prefix,
}: {
  value: CarouselBackground;
  onChange: (bg: CarouselBackground) => void;
  prefix: string;
}) {
  const set = (patch: Partial<CarouselBackground>) => onChange({ ...value, ...patch });

  return (
    <Stack gap="3">
      <Select
        label="Background type"
        value={value.type}
        onChange={(e) => onChange({ type: e.target.value as CarouselBackground["type"] })}
        options={BG_TYPE_OPTIONS}
      />

      {(value.type === "image" || value.type === "video") && (
        <>
          <Input
            label={`${value.type === "image" ? "Image" : "Video"} URL`}
            value={value.url ?? ""}
            onChange={(e) => set({ url: e.target.value })}
            placeholder="https://..."
          />
          <Input
            label="Mobile URL (optional)"
            value={value.mobileUrl ?? ""}
            onChange={(e) => set({ mobileUrl: e.target.value || undefined })}
            placeholder="https://... (portrait crop)"
          />
          {value.type === "video" && (
            <Input
              label="Poster / thumbnail URL"
              value={value.thumbnail ?? ""}
              onChange={(e) => set({ thumbnail: e.target.value || undefined })}
              placeholder="https://..."
            />
          )}
          <Stack className={`${__P.p3}`} gap="sm" rounded="lg" border="default">
            <Toggle
              label="Dim overlay"
              checked={value.dimOverlay?.enabled ?? false}
              onChange={(v) => set({ dimOverlay: { enabled: v, opacity: value.dimOverlay?.opacity ?? 40 } })}
            />
            {value.dimOverlay?.enabled && (
              <Div>
                <Text className="mb-1" size="sm" weight="medium">Opacity ({value.dimOverlay.opacity}%)</Text>
                <input
                  type="range"
                  min={0}
                  max={90}
                  step={5}
                  value={value.dimOverlay.opacity}
                  onChange={(e) => set({ dimOverlay: { enabled: true, opacity: Number(e.target.value) } })}
                  className="w-full"
                />
              </Div>
            )}
          </Stack>
        </>
      )}

      {value.type === "color" && (
        <Input
          label="Colour (CSS token or hex)"
          value={value.color ?? ""}
          onChange={(e) => set({ color: e.target.value })}
          // audit-hex-tokens-ok: placeholder text shown to admin as example
          placeholder="var(--appkit-color-primary) or #1a1a2e"
        />
      )}

      {value.type === "gradient" && (
        <>
          <Input
            label="From colour"
            value={value.gradientFrom ?? ""}
            onChange={(e) => set({ gradientFrom: e.target.value })}
            placeholder="var(--appkit-color-primary)"
          />
          <Input
            label="To colour"
            value={value.gradientTo ?? ""}
            onChange={(e) => set({ gradientTo: e.target.value })}
            placeholder="var(--appkit-color-secondary)"
          />
          <Input
            label="Angle (degrees)"
            type="number"
            value={String(value.gradientAngle ?? 135)}
            onChange={(e) => set({ gradientAngle: Number(e.target.value) })}
            min={0}
            max={360}
          />
        </>
      )}
    </Stack>
  );
}

// ── Card Editor ──────────────────────────────────────────────────────────────

function CardEditor({
  card,
  index,
  otherZones,
  onChange,
  onRemove,
}: {
  card: CarouselCard;
  index: number;
  otherZones: number[];
  onChange: (c: CarouselCard) => void;
  onRemove: () => void;
}) {
  const set = (patch: Partial<CarouselCard>) => onChange({ ...card, ...patch });
  const setContent = (patch: Partial<NonNullable<CarouselCard["content"]>>) =>
    onChange({ ...card, content: { ...card.content, ...patch } });

  const isZoneDisabled = (z: 1 | 2 | 3 | 4 | 5 | 6) => otherZones.includes(z);

  const buttons = card.buttons ?? [];

  return (
    <Div className={CLS_PANEL}>
      <Row className={CLS_ROW_BETWEEN}>
        <Heading level={4} size="sm" weight="semibold">Card {index + 1}</Heading>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>Remove</Button>
      </Row>

      <ZonePicker
        selected={card.zone}
        onChange={(z) => set({ zone: z })}
        disabled={isZoneDisabled}
      />

      <Select
        label="Mobile zone"
        value={String(card.mobileZone ?? "")}
        onChange={(e) => set({ mobileZone: e.target.value ? (Number(e.target.value) as 2 | 5) : undefined })}
        options={[
          { value: "", label: "— inherit desktop zone —" },
          { value: "2", label: "Zone 2 (row 1, center)" },
          { value: "5", label: "Zone 5 (row 2, center)" },
        ]}
      />

      <Div>
        <Text className="mb-2" size="sm" weight="medium">Background</Text>
        <BackgroundEditor
          value={card.background}
          onChange={(bg) => set({ background: bg })}
          prefix={`card-${index}`}
        />
      </Div>

      <Stack gap="sm">
        <Text size="sm" weight="medium">Content</Text>
        <Input label="Eyebrow" value={card.content?.eyebrow ?? ""} onChange={(e) => setContent({ eyebrow: e.target.value || undefined })} placeholder="New · Limited · Featured" />
        <Input label="Title" value={card.content?.title ?? ""} onChange={(e) => setContent({ title: e.target.value })} />
        <Input label="Subtitle" value={card.content?.subtitle ?? ""} onChange={(e) => setContent({ subtitle: e.target.value || undefined })} />
        <Input label="Description" value={card.content?.description ?? ""} onChange={(e) => setContent({ description: e.target.value || undefined })} />
        {/* audit-hex-tokens-ok: text-color default when card has none set */}
        <Input label="Text colour (CSS)" value={card.content?.textColor ?? "#ffffff"} onChange={(e) => setContent({ textColor: e.target.value })} />
        <Select label="Text align" value={card.content?.textAlign ?? "left"} onChange={(e) => setContent({ textAlign: e.target.value as "left" | "center" | "right" })} options={TEXT_ALIGN_OPTIONS} />
      </Stack>

      <Stack gap="sm">
        <Row className={CLS_ROW_BETWEEN}>
          <Text size="sm" weight="medium">Buttons (max 3)</Text>
          {buttons.length < 3 && (
            <Button type="button" variant="outline" size="sm" onClick={() => set({ buttons: [...buttons, makeButton()] })}>
              + Add button
            </Button>
          )}
        </Row>
        {buttons.map((btn, bi) => (
          <Stack key={btn.id ?? bi} className={`${__P.p3}`} gap="sm" rounded="lg" border="default">
            <Row className={CLS_ROW_BETWEEN}>
              <Text size="xs" weight="medium" color="muted">Button {bi + 1}</Text>
              <Button type="button" variant="ghost" size="sm" onClick={() => set({ buttons: buttons.filter((_, i) => i !== bi) })}>✕</Button>
            </Row>
            <Input label="Label" value={btn.text} onChange={(e) => { const next = [...buttons]; next[bi] = { ...btn, text: e.target.value }; set({ buttons: next }); }} />
            <Input label="Link (href)" value={btn.href} onChange={(e) => { const next = [...buttons]; next[bi] = { ...btn, href: e.target.value }; set({ buttons: next }); }} placeholder="/products or https://..." />
            <Select label="Variant" value={btn.variant} onChange={(e) => { const next = [...buttons]; next[bi] = { ...btn, variant: e.target.value as typeof btn.variant }; set({ buttons: next }); }} options={VARIANT_OPTIONS} />
            <Toggle label="Open in new tab" checked={btn.openInNewTab ?? false} onChange={(v) => { const next = [...buttons]; next[bi] = { ...btn, openInNewTab: v }; set({ buttons: next }); }} />
          </Stack>
        ))}
      </Stack>

      <Stack gap="sm">
        <Text size="sm" weight="medium">Hover effect</Text>
        <Select
          label="Effect"
          value={card.hover?.effect ?? "none"}
          onChange={(e) => set({ hover: { effect: e.target.value as CarouselHoverEffect } })}
          options={HOVER_OPTIONS}
        />
      </Stack>

      <Toggle label="Button-only card (no text content)" checked={card.isButtonOnly ?? false} onChange={(v) => set({ isButtonOnly: v })} />
    </Div>
  );
}

// ── Main Editor ──────────────────────────────────────────────────────────────

export function AdminCarouselEditorView({
  slideId,
  onSaved,
  onDeleted,
  onCancel,
  ...rest
}: AdminCarouselEditorViewProps) {
  const isEdit = Boolean(slideId);

  const [title, setTitle] = React.useState("");
  const [active, setActive] = React.useState(false);
  const [order, setOrder] = React.useState<string>("");
  const [height, setHeight] = React.useState<CarouselSlideHeight>("tall");
  const [autoplayDelayMs, setAutoplayDelayMs] = React.useState<string>("4000");

  const [background, setBackground] = React.useState<CarouselBackground>({
    type: "image",
    url: "",
    dimOverlay: { enabled: true, opacity: 40 },
  });

  const [cards, setCards] = React.useState<CarouselCard[]>([]);

  const [overlayTitle, setOverlayTitle] = React.useState("");
  const [overlaySubtitle, setOverlaySubtitle] = React.useState("");
  const [overlayDesc, setOverlayDesc] = React.useState("");
  const [overlayBtnText, setOverlayBtnText] = React.useState("");
  const [overlayBtnLink, setOverlayBtnLink] = React.useState("");
  const [overlayBtnVariant, setOverlayBtnVariant] = React.useState<"primary" | "secondary" | "outline">("primary");
  const [overlayBtnNewTab, setOverlayBtnNewTab] = React.useState(false);

  const [errorMsg, setErrorMsg] = React.useState("");
  const [successMsg, setSuccessMsg] = React.useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(carouselSlideSchema);

  const slideQuery = useQuery({
    queryKey: ["admin", "carousel", slideId],
    queryFn: async () => {
      const res = await apiClient.get(ADMIN_ENDPOINTS.CAROUSEL_BY_ID(slideId!));
      return (res as { data?: unknown })?.data ?? res;
    },
    enabled: isEdit,
  });

  React.useEffect(() => {
    const d = slideQuery.data as Record<string, unknown> | undefined;
    if (!d) return;
    setTitle(String(d.title ?? ""));
    setActive(Boolean(d.active));
    setOrder(d.order !== undefined ? String(d.order) : "");
    const s = d.settings as Record<string, unknown> | undefined;
    setHeight((s?.height as CarouselSlideHeight) ?? "tall");
    setAutoplayDelayMs(s?.autoplayDelayMs !== undefined ? String(s.autoplayDelayMs) : "4000");
    if (d.background) setBackground(d.background as CarouselBackground);
    if (Array.isArray(d.cards)) setCards(d.cards as CarouselCard[]);
    const ov = d.overlay as Record<string, unknown> | undefined;
    if (ov) {
      setOverlayTitle(String(ov.title ?? ""));
      setOverlaySubtitle(String(ov.subtitle ?? ""));
      setOverlayDesc(String(ov.description ?? ""));
      const btn = ov.button as Record<string, unknown> | undefined;
      if (btn) {
        setOverlayBtnText(String(btn.text ?? ""));
        setOverlayBtnLink(String(btn.link ?? ""));
        setOverlayBtnVariant((btn.variant as "primary" | "secondary" | "outline") ?? "primary");
        setOverlayBtnNewTab(Boolean(btn.openInNewTab));
      }
    }
  }, [slideQuery.data]);

  const buildPayload = () => {
    const overlay =
      overlayTitle || overlaySubtitle || overlayDesc
        ? {
            title: overlayTitle || undefined,
            subtitle: overlaySubtitle || undefined,
            description: overlayDesc || undefined,
            button: overlayBtnText
              ? { text: overlayBtnText, link: overlayBtnLink, variant: overlayBtnVariant, openInNewTab: overlayBtnNewTab }
              : undefined,
          }
        : undefined;

    return {
      title,
      active,
      order: order !== "" ? Number(order) : undefined,
      background,
      settings: {
        height,
        autoplayDelayMs: Number(autoplayDelayMs) || 4000,
      },
      cards,
      overlay,
    };
  };

  const saveMutation = useApiMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      if (isEdit) return apiClient.put(ADMIN_ENDPOINTS.CAROUSEL_BY_ID(slideId!), payload);
      return apiClient.post(ADMIN_ENDPOINTS.CAROUSEL, payload);
    },
    onSuccess: (res: unknown) => {
      const id = (res as { data?: { id?: string } })?.data?.id ?? slideId ?? "";
      setSuccessMsg(isEdit ? "Slide saved." : "Slide created.");
      setErrorMsg("");
      if (onSaved && id) onSaved(id);
    },
    onError: (err: unknown) => {
      setErrorMsg((err as Error)?.message ?? "Failed to save slide.");
      setSuccessMsg("");
    },
  });

  const deleteMutation = useApiMutation({
    mutationFn: () => apiClient.delete(ADMIN_ENDPOINTS.CAROUSEL_BY_ID(slideId!)),
    onSuccess: () => {
      setSuccessMsg("Slide deleted.");
      if (onDeleted) onDeleted();
    },
    onError: (err: unknown) => setErrorMsg((err as Error)?.message ?? "Failed to delete."),
  });

  const occupiedZones = cards.map((c) => c.zone);

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={isEdit ? "Edit Carousel Slide" : "New Carousel Slide"}
      sections={[
        errorMsg ? <Alert key="err" variant="error">{errorMsg}</Alert> : null,
        successMsg ? <Alert key="ok" variant="success">{successMsg}</Alert> : null,

        <FormShellContext.Provider value={shellCtx}>
        <Form
          key="slide-form"
          onSubmit={(e) => {
            e.preventDefault();
            clearErrors();
            if (!title.trim()) { setFieldError("title", "Title is required"); return; }
            saveMutation.mutate();
          }} spacing="lg">
          {/* ── 1. Slide Info ───────────────────────────────────────────── */}
          <Div className={CLS_PANEL}>
            <Heading level={3} className={CLS_SECTION_HEADING}>Slide info</Heading>
            <FieldInput name="title" label="Title" value={title} onChange={(v) => setTitle(v)} required placeholder="e.g. Hot Wheels RLC Exclusives" />
            <Toggle label="Active (visible on homepage)" checked={active} onChange={setActive} />
            <Input label="Display order" type="number" value={order} onChange={(e) => setOrder(e.target.value)} min={0} placeholder="1" />
            <Select
              label="Slide height"
              value={height}
              onChange={(e) => setHeight(e.target.value as CarouselSlideHeight)}
              options={HEIGHT_OPTIONS}
            />
            <Input
              label="Autoplay delay (ms)"
              type="number"
              value={autoplayDelayMs}
              onChange={(e) => setAutoplayDelayMs(e.target.value)}
              min={1000}
              max={15000}
              placeholder="4000"
              helperText="How long this slide shows before auto-advancing. Default: 4000 ms."
            />
          </Div>

          {/* ── 2. Background ────────────────────────────────────────────── */}
          <Div className={CLS_PANEL}>
            <Heading level={3} className={CLS_SECTION_HEADING}>Background</Heading>
            <BackgroundEditor value={background} onChange={setBackground} prefix="slide" />
          </Div>

          {/* ── 3. Overlay text (optional) ───────────────────────────────── */}
          <Div className={CLS_PANEL}>
            <Heading level={3} className={CLS_SECTION_HEADING}>Overlay text (optional)</Heading>
            <Text size="sm" color="muted">Centred text layered over the background. Leave blank to use cards only.</Text>
            <Input label="Heading" value={overlayTitle} onChange={(e) => setOverlayTitle(e.target.value)} placeholder="India's #1 Collectibles Marketplace" />
            <Input label="Subtitle" value={overlaySubtitle} onChange={(e) => setOverlaySubtitle(e.target.value)} placeholder="Pokémon TCG · Hot Wheels · Beyblade X" />
            <Input label="Description" value={overlayDesc} onChange={(e) => setOverlayDesc(e.target.value)} placeholder="One sentence description..." />
            <Stack className={`${__P.p3}`} gap="sm" rounded="lg" border="default">
              <Text size="sm" weight="medium">CTA button</Text>
              <Input label="Button text" value={overlayBtnText} onChange={(e) => setOverlayBtnText(e.target.value)} placeholder="Shop Now" />
              <Input label="Button link" value={overlayBtnLink} onChange={(e) => setOverlayBtnLink(e.target.value)} placeholder="/products" />
              <Select
                label="Variant"
                value={overlayBtnVariant}
                onChange={(e) => setOverlayBtnVariant(e.target.value as typeof overlayBtnVariant)}
                options={VARIANT_OPTIONS.filter((v) => ["primary", "secondary", "outline"].includes(v.value))}
              />
              <Toggle label="Open in new tab" checked={overlayBtnNewTab} onChange={setOverlayBtnNewTab} />
            </Stack>
          </Div>

          {/* ── 4. Cards ─────────────────────────────────────────────────── */}
          <Div className={CLS_PANEL}>
            <Row className={CLS_ROW_BETWEEN}>
              <Heading level={3} className={CLS_SECTION_HEADING}>Cards (0–2)</Heading>
              {cards.length < 2 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const usedZones = cards.map((c) => c.zone);
                    const freeZone = ([1, 2, 3, 4, 5, 6] as const).find((z) => !usedZones.includes(z)) ?? 1;
                    setCards([...cards, makeCard(freeZone)]);
                  }}
                >
                  + Add card
                </Button>
              )}
            </Row>
            {cards.length === 0 && (
              <Text size="sm" color="faint">No cards — the overlay text covers the whole slide.</Text>
            )}
            {cards.map((card, i) => (
              <CardEditor
                key={card.id}
                card={card}
                index={i}
                otherZones={occupiedZones.filter((z) => z !== card.zone)}
                onChange={(updated) => setCards(cards.map((c, ci) => (ci === i ? updated : c)))}
                onRemove={() => setCards(cards.filter((_, ci) => ci !== i))}
              />
            ))}
          </Div>

          {/* ── Actions ──────────────────────────────────────────────────── */}
          <FormActions>
            <Button type="submit" isLoading={saveMutation.isPending} disabled={!title || saveMutation.isPending}>
              {isEdit ? "Save changes" : "Create slide"}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            )}
            {isEdit && (
              <>
                <Button
                  type="button"
                  variant="danger"
                  isLoading={deleteMutation.isPending}
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  {ACTIONS.ADMIN["delete-carousel"].label}
                </Button>
                <ConfirmDeleteModal
                  isOpen={deleteConfirmOpen}
                  onClose={() => setDeleteConfirmOpen(false)}
                  onConfirm={() => { setDeleteConfirmOpen(false); deleteMutation.mutate(); }}
                  title={ACTIONS.ADMIN["delete-carousel"].confirmation!.title}
                  message={ACTIONS.ADMIN["delete-carousel"].confirmation!.body}
                  isDeleting={deleteMutation.isPending}
                />
              </>
            )}
          </FormActions>
        </Form>
        </FormShellContext.Provider>,
      ]}
    />
  );
}
