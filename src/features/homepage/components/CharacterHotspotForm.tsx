"use client"
import React, { useState, useRef } from "react";
import Image from "next/image";
import { Button, Details, Div, Heading, Input, Label, Li, Row, Span, Stack, Summary, Text, Textarea, Ul } from "../../../ui";
import type { CharacterHotspotConfig, HotspotPin } from "../types";

type WizardStep = "image" | "place" | "details" | "review";

interface DraftPosition {
  id: string;
  xPct: number;
  yPct: number;
}

function randomId() {
  return Math.random().toString(36).slice(2, 9);
}

const CLS_STEP = "space-y-4 rounded-lg border-2 p-6";
const CLS_IMG_WRAP = "relative w-full overflow-hidden rounded-lg";
const CLS_INPUT = "rounded border-2 px-3 py-2 text-sm outline-none";
const CLS_ERROR_BANNER = "rounded border border-error bg-error-surface px-4 py-2 text-sm font-bold text-error";
const CLS_SUCCESS_BANNER = "rounded border border-success bg-success-surface px-4 py-2 text-sm font-bold text-success";
const CLS_SUCCESS_TEXT = "text-xs font-medium text-success";
const CLS_DELETE_PIN = "shrink-0 rounded p-1 text-xs text-error hover:bg-error-surface";
const STY_BORDER_INK = "2px solid var(--border-ink)";
const STY_CENTERED = "translate(-50%, -50%)";

export interface CharacterHotspotFormProps {
  initial?: CharacterHotspotConfig | null;
  /**
   * Upload an image and return its public URL.
   * Implement however suits your storage backend:
   * ```ts
 * onUploadImage={async (file) => {
 * const storage = getStorage(getFirebaseApp());
 * const storageRef = ref(storage, `character-hotspot/${Date.now()}_${file.name}`);
 * await uploadBytes(storageRef, file);
 * return getDownloadURL(storageRef);
 * }}
 * ```
   */
  onUploadImage: (file: File) => Promise<string>;
  /**
   * Persist the final config (e.g. write to Firestore).
   */
  onSave: (config: CharacterHotspotConfig) => Promise<void>;
  /**
   * Optional callback after a successful save (e.g. revalidate cache).
   */
  onAfterSave?: () => void | Promise<void>;
}

export function CharacterHotspotForm({
  initial,
  onUploadImage,
  onSave,
  onAfterSave,
}: CharacterHotspotFormProps) {
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [imageAlt, setImageAlt] = useState(
    initial?.imageAlt ?? "DC, Marvel and Anime characters",
  );
  const [active, setActive] = useState(initial?.active ?? true);
  const [pins, setPins] = useState<HotspotPin[]>(initial?.pins ?? []);
  const [step, setStep] = useState<WizardStep>(
    initial?.imageUrl ? "review" : "image",
  );

  const [draftPos, setDraftPos] = useState<DraftPosition | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftUniverse, setDraftUniverse] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftHref, setDraftHref] = useState("");
  const [draftBuyText, setDraftBuyText] = useState("Shop Now");
  const [draftBadge, setDraftBadge] = useState("");
  const [draftAccent, setDraftAccent] = useState("#E8001C");

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await onUploadImage(file);
      setImageUrl(url);
    } catch {
      setError("Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPct =
      Math.round(
        Math.max(
          1,
          Math.min(99, ((e.clientX - rect.left) / rect.width) * 100),
        ) * 10,
      ) / 10;
    const yPct =
      Math.round(
        Math.max(
          1,
          Math.min(99, ((e.clientY - rect.top) / rect.height) * 100),
        ) * 10,
      ) / 10;
    setDraftPos((prev) => ({ id: prev?.id ?? randomId(), xPct, yPct }));
  }

  function commitDraftPin() {
    if (!draftPos) return;
    setPins((prev) => [
      ...prev,
      {
        id: draftPos.id,
        name: draftName,
        universe: draftUniverse,
        description: draftDescription,
        href: draftHref,
        xPct: draftPos.xPct,
        yPct: draftPos.yPct,
        accent: draftAccent,
        badge: draftBadge,
        buyText: draftBuyText,
      },
    ]);
    setDraftPos(null);
    setDraftName("");
    setDraftUniverse("");
    setDraftDescription("");
    setDraftHref("");
    setDraftBuyText("Shop Now");
    setDraftBadge("");
    setDraftAccent("#E8001C");
  }

  function deletePin(id: string) {
    setPins((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleSave() {
    if (!imageUrl) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await onSave({ imageUrl, imageAlt, active, pins });
      await onAfterSave?.();
      setSuccess(true);
    } catch {
      setError("Save failed. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const STEPS: { key: WizardStep; label: string }[] = [
    { key: "image", label: "Image" },
    { key: "place", label: "Place Pin" },
    { key: "details", label: "Pin Details" },
    { key: "review", label: "Review & Save" },
  ];
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <Stack className="mx-auto max-w-3xl" gap="lg">
      {error && (
        <Text className={CLS_ERROR_BANNER}>
          {error}
        </Text>
      )}
      {success && (
        <Text className={CLS_SUCCESS_BANNER}>
          Saved to database successfully!
        </Text>
      )}

      {/* Progress stepper */}
      <Row align="start">
        {STEPS.map((s, i) => (
          <Stack key={s.key} className="flex-1" align="center">
            <Row className="w-full" align="center">
              {i > 0 && (
                <Div
                  className="h-0.5 flex-1"
                  style={{
                    background:
                      i <= stepIndex
                        ? "var(--color-black)"
                        : "var(--border-ink)",
                  }}
                />
              )}
              <Row textWeight="bold" textSize="sm" 
                className="h-8 w-8 shrink-0" align="center" justify="center" rounded="full"
                style={{
                  background:
                    i < stepIndex
                      ? "var(--color-black)"
                      : i === stepIndex
                        ? "var(--color-yellow)"
                        : "var(--surface-elevated)",
                  color:
                    i < stepIndex
                      ? "var(--color-yellow)"
                      : "var(--color-black)",
                  border:
                    i <= stepIndex
                      ? "2px solid var(--color-black)"
                      : STY_BORDER_INK,
                }}
              >
                {i < stepIndex ? "✓" : i + 1}
              </Row>
              {i < STEPS.length - 1 && (
                <Div
                  className="h-0.5 flex-1"
                  style={{
                    background:
                      i < stepIndex
                        ? "var(--color-black)"
                        : "var(--border-ink)",
                  }}
                />
              )}
            </Row>
            <Span
              weight="medium"
              className="mt-1 text-center text-[10px]"
              style={{ color: "var(--color-muted)" }}
            >
              {s.label}
            </Span>
          </Stack>
        ))}
      </Row>

      {/* -- Step 1: Upload Image -- */}
      {step === "image" && (
        <Div
          className={CLS_STEP}
          style={{
            borderColor: "var(--border-ink)",
            background: "var(--surface-elevated)",
          }}
        >
          <Heading level={2} size="lg" weight="bold">
            Upload Background Image
          </Heading>
          <Text style={{ color: "var(--color-muted)" }} size="sm">
            Choose a wide panoramic image that shows all the characters. You
            will place pins on it in the next step.
          </Text>

          <Label layout="flex" gap="md" 
            className="cursor-pointer flex-col justify-center rounded-lg border-2 border-dashed p-8 transition-colors hover:opacity-80"
            style={{ borderColor: "var(--border-ink)" }}
          >
            <Span size="3xl">🖼</Span>
            <Span weight="medium">
              {uploading ? "Uploading…" : "Click to choose image"}
            </Span>
            <Span size="xs" style={{ color: "var(--color-muted)" }}>
              JPG, PNG, WebP — wide landscape images work best
            </Span>
            <Input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={uploading}
            />
          </Label>

          {imageUrl && (
            <Stack gap="xs">
              <Div
                className={CLS_IMG_WRAP}
                style={{ paddingTop: "37.5%" }}
              >
                <Image
                  src={imageUrl}
                  alt={imageAlt}
                  fill
                  className="object-cover"
                  sizes="680px"
                />
              </Div>
              <Text className={CLS_SUCCESS_TEXT}>
                ✓ Image uploaded
              </Text>
            </Stack>
          )}

          <Stack gap="xs">
            <Label size="sm" weight="bold">Image Alt Text</Label>
            <Input
              type="text"
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              placeholder="DC, Marvel and Anime characters"
              className={CLS_INPUT}
              style={{
                borderColor: "var(--border-ink)",
                background: "var(--surface-elevated)",
                color: "var(--color-black)",
              }}
            />
          </Stack>

          <Label layout="inline-flex" gap="md" className="cursor-pointer" size="sm" weight="medium">
            <Input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Active (show on homepage)
          </Label>

          <Row
            justify="end"
            gap="sm"
            className="border-t" padding="t-md"
            style={{ borderColor: "var(--border-ink)" }}
          >
            {(initial?.pins?.length ?? 0) > 0 && (
              <Button
                type="button"
                onClick={() => setStep("review")}
                variant="ghost"
                className="px-4 py-2 text-sm font-medium rounded transition-opacity hover:opacity-70"
                style={{
                  background: "transparent",
                  color: "var(--color-black)",
                }}
              >
                Skip to Review
              </Button>
            )}
            <Button
              type="button"
              onClick={() => setStep("place")}
              disabled={!imageUrl || uploading}
              variant="primary"
              className="px-4 py-2 text-sm font-bold rounded transition-opacity disabled:opacity-50"
              style={{
                background: "var(--color-black)",
                color: "var(--color-yellow)",
              }}
            >
              Next: Place Pins →
            </Button>
          </Row>
        </Div>
      )}

      {/* -- Step 2: Place Pin -- */}
      {step === "place" && (
        <Div
          className={CLS_STEP}
          style={{
            borderColor: "var(--border-ink)",
            background: "var(--surface-elevated)",
          }}
        >
          <Heading level={2} size="lg" weight="bold">
            Place a Pin
          </Heading>
          <Text style={{ color: "var(--color-muted)" }} size="sm">
            <Span weight="bold">Click anywhere on the image</Span> to drop a pin, or enter
            exact coordinates below.
          </Text>

          <Div
            ref={containerRef}
            className={CLS_IMG_WRAP}
            style={{
              paddingTop: "56.25%",
              cursor: "crosshair",
              background: "#111",
            }}
            onClick={handleImageClick}
          >
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              className="object-cover"
              sizes="(max-width: 680px) 100vw"
            />

            {pins.map((pin) => (
              <Div
                key={pin.id}
                className="pointer-events-none absolute"
                style={{
                  left: `${pin.xPct}%`,
                  top: `${pin.yPct}%`,
                  transform: STY_CENTERED,
                  zIndex: 10,
                }}
              >
                <Row textWeight="bold" textSize="xs" 
                  className="text-white" align="center" justify="center" rounded="full"
                  style={{
                    width: 24,
                    height: 24,
                    background: pin.accent || "#E8001C",
                    border: "2px solid white",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
                  }}
                >
                  +
                </Row>
                {pin.name && (
                  <Div textWeight="bold" 
                    className="pointer-events-none absolute left-7 top-1/2 -translate-y-1/2 whitespace-nowrap px-1.5 py-0.5 text-[9px] text-white" rounded="default"
                    style={{ background: "#0D0D0D" }}
                  >
                    {pin.name}
                  </Div>
                )}
              </Div>
            ))}

            {draftPos && (
              <Div
                className="absolute"
                style={{
                  left: `${draftPos.xPct}%`,
                  top: `${draftPos.yPct}%`,
                  transform: STY_CENTERED,
                  zIndex: 20,
                }}
              >
                <Span
                  className="absolute animate-ping" rounded="full"
                  style={{
                    inset: -6,
                    background: "rgba(255,228,0,0.4)",
                    pointerEvents: "none",
                  }}
                />
                <Row textWeight="bold" 
                  className="relative" align="center" justify="center" rounded="full"
                  style={{
                    width: 32,
                    height: 32,
                    background: "var(--color-yellow)",
                    border: "3px solid var(--color-black)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.55)",
                    color: "var(--color-black)",
                    fontSize: 18,
                  }}
                >
                  ★
                </Row>
                <Div textWeight="bold" 
                  className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 whitespace-nowrap py-0.5 text-[10px]" padding="x-xs" rounded="default"
                  style={{
                    background: "var(--color-black)",
                    color: "var(--color-yellow)",
                  }}
                >
                  NEW PIN
                </Div>
              </Div>
            )}
          </Div>

          <Div layout="grid" gap="3" className="grid-cols-2">
            {(
              [
                {
                  label: "X Position (%)",
                  field: "xPct",
                  value: draftPos?.xPct ?? "",
                  onChange: (v: number) =>
                    setDraftPos((prev) => ({
                      id: prev?.id ?? randomId(),
                      xPct: Math.max(1, Math.min(99, v)),
                      yPct: prev?.yPct ?? 50,
                    })),
                },
                {
                  label: "Y Position (%)",
                  field: "yPct",
                  value: draftPos?.yPct ?? "",
                  onChange: (v: number) =>
                    setDraftPos((prev) => ({
                      id: prev?.id ?? randomId(),
                      xPct: prev?.xPct ?? 50,
                      yPct: Math.max(1, Math.min(99, v)),
                    })),
                },
              ] as const
            ).map(({ label, field, value, onChange }) => (
              <Stack key={field} gap="xs">
                <Label size="sm" weight="bold">{label}</Label>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  step={0.1}
                  value={value}
                  placeholder="e.g. 42.5"
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v)) onChange(v);
                  }}
                  className={CLS_INPUT}
                  style={{
                    borderColor: "var(--border-ink)",
                    background: "var(--surface-elevated)",
                    color: "var(--color-black)",
                  }}
                />
              </Stack>
            ))}
          </Div>

          {pins.length > 0 && (
            <Text style={{ color: "var(--color-muted)" }} size="xs">
              {pins.length} pin{pins.length !== 1 ? "s" : ""} already placed on
              this image.
            </Text>
          )}

          <Row
            justify="between"
            className="border-t" padding="t-md"
            style={{ borderColor: "var(--border-ink)" }}
          >
            <Button
              type="button"
              onClick={() => setStep("image")}
              variant="ghost"
              className="px-4 py-2 text-sm font-medium rounded transition-opacity hover:opacity-70"
              style={{ background: "transparent", color: "var(--color-black)" }}
            >
              ← Back
            </Button>
            <Row gap="sm">
              {pins.length > 0 && (
                <Button
                  type="button"
                  onClick={() => setStep("review")}
                  variant="outline"
                  className="px-4 py-2 text-sm font-bold rounded transition-opacity"
                  style={{
                    background: "var(--surface-warm)",
                    color: "var(--color-black)",
                    border: STY_BORDER_INK,
                  }}
                >
                  Done Adding Pins
                </Button>
              )}
              <Button
                type="button"
                onClick={() => setStep("details")}
                disabled={!draftPos}
                variant="primary"
                className="px-4 py-2 text-sm font-bold rounded transition-opacity disabled:opacity-50"
                style={{
                  background: "var(--color-black)",
                  color: "var(--color-yellow)",
                }}
              >
                Continue: Add Details →
              </Button>
            </Row>
          </Row>
        </Div>
      )}

      {/* -- Step 3: Pin Details -- */}
      {step === "details" && (
        <Div
          className={CLS_STEP}
          style={{
            borderColor: "var(--border-ink)",
            background: "var(--surface-elevated)",
          }}
        >
          <Heading level={2} size="lg" weight="bold">
            Pin Details
          </Heading>
          <Text style={{ color: "var(--color-muted)" }} size="sm">
            Fill in the details for the pin at{" "}
            <Span weight="bold">
              {draftPos?.xPct}%, {draftPos?.yPct}%
            </Span>
            .
          </Text>

          <Div layout="grid" gap="3" className="grid-cols-2">
            {(
              [
                {
                  label: "Name *",
                  value: draftName,
                  onChange: setDraftName,
                  placeholder: "SPIDER-MAN",
                },
                {
                  label: "Universe / Category *",
                  value: draftUniverse,
                  onChange: setDraftUniverse,
                  placeholder: "Marvel",
                },
              ] as const
            ).map(({ label, value, onChange, placeholder }) => (
              <Stack key={label} gap="xs">
                <Label size="sm" weight="bold">{label}</Label>
                <Input
                  type="text"
                  value={value}
                  onChange={(e) =>
                    (onChange as (v: string) => void)(e.target.value)
                  }
                  placeholder={placeholder}
                  className={CLS_INPUT}
                  style={{
                    borderColor: "var(--border-ink)",
                    background: "var(--surface-elevated)",
                    color: "var(--color-black)",
                  }}
                />
              </Stack>
            ))}
          </Div>

          <Stack gap="xs">
            <Label size="sm" weight="bold">Description *</Label>
            <Textarea
              rows={3}
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              className="resize-none rounded border-2 px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "var(--border-ink)",
                background: "var(--surface-elevated)",
                color: "var(--color-black)",
              }}
              placeholder="Short description shown in the popup…"
            />
          </Stack>

          <Stack gap="xs">
            <Label size="sm" weight="bold">Link (href) *</Label>
            <Input
              type="text"
              value={draftHref}
              onChange={(e) => setDraftHref(e.target.value)}
              placeholder="/franchise/marvel"
              className={CLS_INPUT}
              style={{
                borderColor: "var(--border-ink)",
                background: "var(--surface-elevated)",
                color: "var(--color-black)",
              }}
            />
          </Stack>

          <Div layout="grid" gap="3" className="grid-cols-2">
            {(
              [
                {
                  label: "Button Text *",
                  value: draftBuyText,
                  onChange: setDraftBuyText,
                  placeholder: "Get Spider-Man Figures",
                },
                {
                  label: "Badge Label",
                  value: draftBadge,
                  onChange: setDraftBadge,
                  placeholder: "MARVEL",
                },
              ] as const
            ).map(({ label, value, onChange, placeholder }) => (
              <Stack key={label} gap="xs">
                <Label size="sm" weight="bold">{label}</Label>
                <Input
                  type="text"
                  value={value}
                  onChange={(e) =>
                    (onChange as (v: string) => void)(e.target.value)
                  }
                  placeholder={placeholder}
                  className={CLS_INPUT}
                  style={{
                    borderColor: "var(--border-ink)",
                    background: "var(--surface-elevated)",
                    color: "var(--color-black)",
                  }}
                />
              </Stack>
            ))}
          </Div>

          <Row align="end" gap="sm">
            <Stack className="flex-1" gap="xs">
              <Label size="sm" weight="bold">Accent Colour (hex)</Label>
              <Input
                type="text"
                value={draftAccent}
                onChange={(e) => setDraftAccent(e.target.value)}
                placeholder="#E8001C"
                className={CLS_INPUT}
                style={{
                  borderColor: "var(--border-ink)",
                  background: "var(--surface-elevated)",
                  color: "var(--color-black)",
                }}
              />
            </Stack>
            <Input
              type="color"
              value={draftAccent}
              onChange={(e) => setDraftAccent(e.target.value)}
              className="mb-0.5 h-10 w-10 cursor-pointer rounded border-2"
              style={{ borderColor: "var(--border-ink)" }}
              title="Pick colour"
            />
          </Row>

          <Row
            justify="between"
            className="border-t" padding="t-md"
            style={{ borderColor: "var(--border-ink)" }}
          >
            <Button
              type="button"
              onClick={() => setStep("place")}
              variant="ghost"
              className="px-4 py-2 text-sm font-medium rounded transition-opacity hover:opacity-70"
              style={{ background: "transparent", color: "var(--color-black)" }}
            >
              ← Back
            </Button>
            <Row gap="sm">
              <Button
                type="button"
                disabled={!draftName || !draftHref}
                onClick={() => {
                  commitDraftPin();
                  setStep("review");
                }}
                variant="outline"
                className="px-4 py-2 text-sm font-bold rounded transition-opacity disabled:opacity-50"
                style={{
                  background: "var(--surface-warm)",
                  color: "var(--color-black)",
                  border: STY_BORDER_INK,
                }}
              >
                Save Pin &amp; Finish
              </Button>
              <Button
                type="button"
                disabled={!draftName || !draftHref}
                onClick={() => {
                  commitDraftPin();
                  setStep("place");
                }}
                variant="primary"
                className="px-4 py-2 text-sm font-bold rounded transition-opacity disabled:opacity-50"
                style={{
                  background: "var(--color-black)",
                  color: "var(--color-yellow)",
                }}
              >
                Save Pin &amp; Add Another →
              </Button>
            </Row>
          </Row>
        </Div>
      )}

      {/* -- Step 4: Review & Save -- */}
      {step === "review" && (
        <Div
          className={CLS_STEP}
          style={{
            borderColor: "var(--border-ink)",
            background: "var(--surface-elevated)",
          }}
        >
          <Row justify="between">
            <Heading level={2} size="lg" weight="bold">
              Review &amp; Save
            </Heading>
            <Span rounded="full" padding="pill-md" size="sm" weight="bold"
              style={{ background: "var(--surface-warm)" }}
            >
              {pins.length} pin{pins.length !== 1 ? "s" : ""}
            </Span>
          </Row>

          {/* Preview image */}
          <Div
            className={CLS_IMG_WRAP}
            style={{ paddingTop: "56.25%", background: "#111" }}
          >
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              className="object-cover"
              sizes="(max-width: 680px) 100vw"
            />
            {pins.map((pin) => (
              <Div
                key={pin.id}
                className="pointer-events-none absolute"
                style={{
                  left: `${pin.xPct}%`,
                  top: `${pin.yPct}%`,
                  transform: STY_CENTERED,
                  zIndex: 10,
                }}
              >
                <Row textWeight="bold" textSize="xs" 
                  className="text-white" align="center" justify="center" rounded="full"
                  style={{
                    width: 28,
                    height: 28,
                    background: pin.accent || "#E8001C",
                    border: "2px solid white",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.55)",
                  }}
                >
                  +
                </Row>
                {pin.name && (
                  <Div textWeight="bold" 
                    className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2 whitespace-nowrap px-1.5 py-0.5 text-[9px] text-white" rounded="default"
                    style={{ background: "#0D0D0D" }}
                  >
                    {pin.name}
                  </Div>
                )}
              </Div>
            ))}
          </Div>

          {/* Pin list */}
          {pins.length > 0 ? (
            <Ul
              className="divide-y rounded-lg border"
              style={{ borderColor: "var(--border-ink)" }}
            >
              {pins.map((pin, i) => (
                <Li key={pin.id} className="px-4 py-3">
                  <Row gap="sm">
                    <Span layout="flex-center" color="inverse" 
                      className="h-6 w-6 shrink-0" rounded="full" size="xs" weight="bold"
                      style={{ background: pin.accent || "#E8001C" }}
                    >
                      {i + 1}
                    </Span>
                    <Div className="min-w-0 flex-1">
                      <Text className="truncate" size="sm" weight="bold">
                        {pin.name || (
                          <Span
                            className="italic"
                            style={{ color: "var(--color-muted)" }}
                          >
                            Unnamed
                          </Span>
                        )}
                      </Text>
                      <Text
                        style={{ color: "var(--color-muted)" }} size="xs">
                        {pin.universe} · {pin.xPct.toFixed(0)}%,{" "}
                        {pin.yPct.toFixed(0)}%
                      </Text>
                    </Div>
                    <Button
                      type="button"
                      onClick={() => deletePin(pin.id)}
                      variant="ghost"
                      className={CLS_DELETE_PIN}
                      title="Remove pin"
                    >
                      ✕
                    </Button>
                  </Row>
                </Li>
              ))}
            </Ul>
          ) : (
            <Div textSize="sm" 
              className="border-2 border-dashed text-center" rounded="lg" padding="xl"
              style={{
                borderColor: "var(--border-ink)",
                color: "var(--color-muted)",
              }}
            >
              No pins yet — add some using the button below.
            </Div>
          )}

          {/* Image settings */}
          <Details
            className="rounded-lg border p-3"
            style={{ borderColor: "var(--border-ink)" }}
          >
            <Summary className="cursor-pointer text-sm font-medium">
              Image Settings
            </Summary>
            <Stack className="mt-3" gap="3">
              <Label layout="inline-flex" gap="md" 
                className="cursor-pointer rounded border-2 border-dashed px-3 py-1.5 transition-colors hover:opacity-80" size="sm" weight="medium"
                style={{ borderColor: "var(--border-ink)" }}
              >
                {uploading ? "Uploading…" : "Replace Image"}
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </Label>
              <Stack gap="xs">
                <Label size="sm" weight="bold">Image Alt Text</Label>
                <Input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  className={CLS_INPUT}
                  style={{
                    borderColor: "var(--border-ink)",
                    background: "var(--surface-elevated)",
                    color: "var(--color-black)",
                  }}
                />
              </Stack>
              <Label layout="inline-flex" gap="md" className="cursor-pointer" size="sm" weight="medium">
                <Input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                Active (show on homepage)
              </Label>
            </Stack>
          </Details>

          <Row
            justify="between"
            className="border-t" padding="t-md"
            style={{ borderColor: "var(--border-ink)" }}
          >
            <Button
              type="button"
              onClick={() => {
                setDraftPos(null);
                setStep("place");
              }}
              variant="outline"
              className="px-4 py-2 text-sm font-bold rounded transition-opacity"
              style={{
                background: "var(--surface-warm)",
                color: "var(--color-black)",
                border: STY_BORDER_INK,
              }}
            >
              + Add Another Pin
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!imageUrl || saving || pins.length === 0}
              variant="primary"
              className="px-4 py-2 text-sm font-bold rounded transition-opacity disabled:opacity-50"
              style={{
                background: "var(--color-black)",
                color: "var(--color-yellow)",
              }}
            >
              {saving ? "Saving…" : "Save to Database"}
            </Button>
          </Row>
        </Div>
      )}
    </Stack>
  );
}
