"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  Button,
  Div,
  Heading,
  Input,
  Label,
  Li,
  Span,
  Text,
  Textarea,
  Ul,
} from "@mohasinac/ui";
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

export interface CharacterHotspotFormProps {
  initial?: CharacterHotspotConfig | null;
  /**
   * Upload an image and return its public URL.
   * Implement however suits your storage backend:
   * ```ts
   * onUploadImage={async (file) => {
   *   const storage = getStorage(getFirebaseApp());
   *   const storageRef = ref(storage, `character-hotspot/${Date.now()}_${file.name}`);
   *   await uploadBytes(storageRef, file);
   *   return getDownloadURL(storageRef);
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
    <Div className="mx-auto max-w-3xl space-y-6">
      {error && (
        <Text className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600">
          {error}
        </Text>
      )}
      {success && (
        <Text className="rounded border border-green-200 bg-green-50 px-4 py-2 text-sm font-bold text-green-700">
          Saved to database successfully!
        </Text>
      )}

      {/* Progress stepper */}
      <Div className="flex items-start">
        {STEPS.map((s, i) => (
          <Div key={s.key} className="flex flex-1 flex-col items-center">
            <Div className="flex w-full items-center">
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
              <Div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
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
                      : "2px solid var(--border-ink)",
                }}
              >
                {i < stepIndex ? "✓" : i + 1}
              </Div>
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
            </Div>
            <Span
              className="mt-1 text-center text-[10px] font-medium"
              style={{ color: "var(--color-muted)" }}
            >
              {s.label}
            </Span>
          </Div>
        ))}
      </Div>

      {/* ── Step 1: Upload Image ── */}
      {step === "image" && (
        <Div
          className="space-y-4 rounded-lg border-2 p-6"
          style={{
            borderColor: "var(--border-ink)",
            background: "var(--surface-elevated)",
          }}
        >
          <Heading level={2} className="text-lg font-bold">
            Upload Background Image
          </Heading>
          <Text className="text-sm" style={{ color: "var(--color-muted)" }}>
            Choose a wide panoramic image that shows all the characters. You
            will place pins on it in the next step.
          </Text>

          <Label
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors hover:opacity-80"
            style={{ borderColor: "var(--border-ink)" }}
          >
            <Span className="text-3xl">🖼</Span>
            <Span className="font-medium">
              {uploading ? "Uploading…" : "Click to choose image"}
            </Span>
            <Span className="text-xs" style={{ color: "var(--color-muted)" }}>
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
            <Div className="space-y-1">
              <Div
                className="relative w-full overflow-hidden rounded-lg"
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
              <Text className="text-xs font-medium text-green-700">
                ✓ Image uploaded
              </Text>
            </Div>
          )}

          <Div className="flex flex-col gap-1">
            <Label className="text-sm font-bold">Image Alt Text</Label>
            <Input
              type="text"
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              placeholder="DC, Marvel and Anime characters"
              className="rounded border-2 px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "var(--border-ink)",
                background: "var(--surface-elevated)",
                color: "var(--color-black)",
              }}
            />
          </Div>

          <Label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
            <Input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Active (show on homepage)
          </Label>

          <Div
            className="flex items-center justify-end gap-3 border-t pt-4"
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
          </Div>
        </Div>
      )}

      {/* ── Step 2: Place Pin ── */}
      {step === "place" && (
        <Div
          className="space-y-4 rounded-lg border-2 p-6"
          style={{
            borderColor: "var(--border-ink)",
            background: "var(--surface-elevated)",
          }}
        >
          <Heading level={2} className="text-lg font-bold">
            Place a Pin
          </Heading>
          <Text className="text-sm" style={{ color: "var(--color-muted)" }}>
            <strong>Click anywhere on the image</strong> to drop a pin, or enter
            exact coordinates below.
          </Text>

          <Div
            ref={containerRef}
            className="relative w-full overflow-hidden rounded-lg"
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
                  transform: "translate(-50%, -50%)",
                  zIndex: 10,
                }}
              >
                <Div
                  className="flex items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{
                    width: 24,
                    height: 24,
                    background: pin.accent || "#E8001C",
                    border: "2px solid white",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
                  }}
                >
                  +
                </Div>
                {pin.name && (
                  <Div
                    className="pointer-events-none absolute left-7 top-1/2 -translate-y-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-bold text-white"
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
                  transform: "translate(-50%, -50%)",
                  zIndex: 20,
                }}
              >
                <Span
                  className="absolute animate-ping rounded-full"
                  style={{
                    inset: -6,
                    background: "rgba(255,228,0,0.4)",
                    pointerEvents: "none",
                  }}
                />
                <Div
                  className="relative flex items-center justify-center rounded-full font-bold"
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
                </Div>
                <Div
                  className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-bold"
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

          <Div className="grid grid-cols-2 gap-3">
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
              <Div key={field} className="flex flex-col gap-1">
                <Label className="text-sm font-bold">{label}</Label>
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
                  className="rounded border-2 px-3 py-2 text-sm outline-none"
                  style={{
                    borderColor: "var(--border-ink)",
                    background: "var(--surface-elevated)",
                    color: "var(--color-black)",
                  }}
                />
              </Div>
            ))}
          </Div>

          {pins.length > 0 && (
            <Text className="text-xs" style={{ color: "var(--color-muted)" }}>
              {pins.length} pin{pins.length !== 1 ? "s" : ""} already placed on
              this image.
            </Text>
          )}

          <Div
            className="flex items-center justify-between border-t pt-4"
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
            <Div className="flex items-center gap-3">
              {pins.length > 0 && (
                <Button
                  type="button"
                  onClick={() => setStep("review")}
                  variant="outline"
                  className="px-4 py-2 text-sm font-bold rounded transition-opacity"
                  style={{
                    background: "var(--surface-warm)",
                    color: "var(--color-black)",
                    border: "2px solid var(--border-ink)",
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
            </Div>
          </Div>
        </Div>
      )}

      {/* ── Step 3: Pin Details ── */}
      {step === "details" && (
        <Div
          className="space-y-4 rounded-lg border-2 p-6"
          style={{
            borderColor: "var(--border-ink)",
            background: "var(--surface-elevated)",
          }}
        >
          <Heading level={2} className="text-lg font-bold">
            Pin Details
          </Heading>
          <Text className="text-sm" style={{ color: "var(--color-muted)" }}>
            Fill in the details for the pin at{" "}
            <strong>
              {draftPos?.xPct}%, {draftPos?.yPct}%
            </strong>
            .
          </Text>

          <Div className="grid grid-cols-2 gap-3">
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
              <Div key={label} className="flex flex-col gap-1">
                <Label className="text-sm font-bold">{label}</Label>
                <Input
                  type="text"
                  value={value}
                  onChange={(e) =>
                    (onChange as (v: string) => void)(e.target.value)
                  }
                  placeholder={placeholder}
                  className="rounded border-2 px-3 py-2 text-sm outline-none"
                  style={{
                    borderColor: "var(--border-ink)",
                    background: "var(--surface-elevated)",
                    color: "var(--color-black)",
                  }}
                />
              </Div>
            ))}
          </Div>

          <Div className="flex flex-col gap-1">
            <Label className="text-sm font-bold">Description *</Label>
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
          </Div>

          <Div className="flex flex-col gap-1">
            <Label className="text-sm font-bold">Link (href) *</Label>
            <Input
              type="text"
              value={draftHref}
              onChange={(e) => setDraftHref(e.target.value)}
              placeholder="/franchise/marvel"
              className="rounded border-2 px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "var(--border-ink)",
                background: "var(--surface-elevated)",
                color: "var(--color-black)",
              }}
            />
          </Div>

          <Div className="grid grid-cols-2 gap-3">
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
              <Div key={label} className="flex flex-col gap-1">
                <Label className="text-sm font-bold">{label}</Label>
                <Input
                  type="text"
                  value={value}
                  onChange={(e) =>
                    (onChange as (v: string) => void)(e.target.value)
                  }
                  placeholder={placeholder}
                  className="rounded border-2 px-3 py-2 text-sm outline-none"
                  style={{
                    borderColor: "var(--border-ink)",
                    background: "var(--surface-elevated)",
                    color: "var(--color-black)",
                  }}
                />
              </Div>
            ))}
          </Div>

          <Div className="flex items-end gap-3">
            <Div className="flex-1 flex flex-col gap-1">
              <Label className="text-sm font-bold">Accent Colour (hex)</Label>
              <Input
                type="text"
                value={draftAccent}
                onChange={(e) => setDraftAccent(e.target.value)}
                placeholder="#E8001C"
                className="rounded border-2 px-3 py-2 text-sm outline-none"
                style={{
                  borderColor: "var(--border-ink)",
                  background: "var(--surface-elevated)",
                  color: "var(--color-black)",
                }}
              />
            </Div>
            <Input
              type="color"
              value={draftAccent}
              onChange={(e) => setDraftAccent(e.target.value)}
              className="mb-0.5 h-10 w-10 cursor-pointer rounded border-2"
              style={{ borderColor: "var(--border-ink)" }}
              title="Pick colour"
            />
          </Div>

          <Div
            className="flex items-center justify-between border-t pt-4"
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
            <Div className="flex items-center gap-3">
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
                  border: "2px solid var(--border-ink)",
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
            </Div>
          </Div>
        </Div>
      )}

      {/* ── Step 4: Review & Save ── */}
      {step === "review" && (
        <Div
          className="space-y-4 rounded-lg border-2 p-6"
          style={{
            borderColor: "var(--border-ink)",
            background: "var(--surface-elevated)",
          }}
        >
          <Div className="flex items-center justify-between">
            <Heading level={2} className="text-lg font-bold">
              Review &amp; Save
            </Heading>
            <Span
              className="rounded-full px-3 py-1 text-sm font-bold"
              style={{ background: "var(--surface-warm)" }}
            >
              {pins.length} pin{pins.length !== 1 ? "s" : ""}
            </Span>
          </Div>

          {/* Preview image */}
          <Div
            className="relative w-full overflow-hidden rounded-lg"
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
                  transform: "translate(-50%, -50%)",
                  zIndex: 10,
                }}
              >
                <Div
                  className="flex items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{
                    width: 28,
                    height: 28,
                    background: pin.accent || "#E8001C",
                    border: "2px solid white",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.55)",
                  }}
                >
                  +
                </Div>
                {pin.name && (
                  <Div
                    className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-bold text-white"
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
                <Li key={pin.id} className="flex items-center gap-3 px-4 py-3">
                  <Span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: pin.accent || "#E8001C" }}
                  >
                    {i + 1}
                  </Span>
                  <Div className="min-w-0 flex-1">
                    <Text className="truncate text-sm font-bold">
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
                      className="text-xs"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {pin.universe} · {pin.xPct.toFixed(0)}%,{" "}
                      {pin.yPct.toFixed(0)}%
                    </Text>
                  </Div>
                  <Button
                    type="button"
                    onClick={() => deletePin(pin.id)}
                    variant="ghost"
                    className="shrink-0 rounded p-1 text-xs text-red-500 hover:bg-red-50"
                    title="Remove pin"
                  >
                    ✕
                  </Button>
                </Li>
              ))}
            </Ul>
          ) : (
            <Div
              className="rounded-lg border-2 border-dashed p-8 text-center text-sm"
              style={{
                borderColor: "var(--border-ink)",
                color: "var(--color-muted)",
              }}
            >
              No pins yet — add some using the button below.
            </Div>
          )}

          {/* Image settings */}
          <details
            className="rounded-lg border p-3"
            style={{ borderColor: "var(--border-ink)" }}
          >
            <summary className="cursor-pointer text-sm font-medium">
              Image Settings
            </summary>
            <Div className="mt-3 space-y-3">
              <Label
                className="inline-flex cursor-pointer items-center gap-2 rounded border-2 border-dashed px-3 py-1.5 text-sm font-medium transition-colors hover:opacity-80"
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
              <Div className="flex flex-col gap-1">
                <Label className="text-sm font-bold">Image Alt Text</Label>
                <Input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  className="rounded border-2 px-3 py-2 text-sm outline-none"
                  style={{
                    borderColor: "var(--border-ink)",
                    background: "var(--surface-elevated)",
                    color: "var(--color-black)",
                  }}
                />
              </Div>
              <Label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
                <Input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                Active (show on homepage)
              </Label>
            </Div>
          </details>

          <Div
            className="flex items-center justify-between border-t pt-4"
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
                border: "2px solid var(--border-ink)",
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
          </Div>
        </Div>
      )}
    </Div>
  );
}
