"use client";

/**
 * PrizeDrawItemsEditor (SB4-A)
 *
 * Editor for the `prizeDrawItems` array on a prize-draw ProductDocument.
 * Owns: add / remove / reorder, per-item title/description/condition/
 * estimatedValue, 1–2 images per item, optional video, and a locked-overlay
 * for items already won during a previous reveal.
 *
 * Min 3 items, max 16 (mirrors PrizeDrawItem schema constraints).
 */

import { useCallback } from "react";
import { Button, Div, FormField, Heading, Row, Span, Stack, Text } from "../../../ui";

const CLS_WARN_BOX = "rounded border border-warning/40 bg-warning-surface px-3 py-2 text-sm text-warning dark:bg-warning-surface dark:text-warning";
const CLS_WON_BADGE = "rounded bg-error-surface px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white";
import { ImageUpload } from "../../media";
import type { PrizeDrawItem } from "../schemas/firestore";

const MIN_ITEMS = 3;
const MAX_ITEMS = 16;
const MAX_IMAGES_PER_ITEM = 2;

const CONDITION_OPTIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "used", label: "Used" },
  { value: "graded", label: "Graded" },
  { value: "refurbished", label: "Refurbished" },
];

export interface PrizeDrawItemsEditorProps {
  items: PrizeDrawItem[];
  onChange: (items: PrizeDrawItem[]) => void;
  /** Upload an image File → returns the resolved storage URL (or media slug). */
  onUploadImage: (file: File, itemNumber: number) => Promise<string>;
  /** Optional video uploader. */
  onUploadVideo?: (file: File, itemNumber: number) => Promise<string>;
  /** Show a non-editable warning above the editor (e.g. "Draw already opened"). */
  warning?: string;
}

export function PrizeDrawItemsEditor({
  items,
  onChange,
  onUploadImage,
  onUploadVideo,
  warning,
}: PrizeDrawItemsEditorProps) {
  // Once any prize has been revealed (isWon=true), the array is frozen for
  // the seller — add/remove/reorder are all blocked. Per-item edits already
  // respect the per-item `locked` flag below.
  const anyWon = items.some((it) => it.isWon);
  const update = useCallback(
    (index: number, patch: Partial<PrizeDrawItem>) => {
      const next = items.map((it, i) => (i === index ? { ...it, ...patch } : it));
      onChange(next);
    },
    [items, onChange],
  );

  const renumber = (list: PrizeDrawItem[]): PrizeDrawItem[] =>
    list.map((it, i) => ({ ...it, itemNumber: i + 1 }));

  const addItem = () => {
    if (items.length >= MAX_ITEMS) return;
    onChange(
      renumber([
        ...items,
        {
          itemNumber: items.length + 1,
          title: "",
          description: "",
          images: [],
          condition: "new",
          isWon: false,
        },
      ]),
    );
  };

  const removeItem = (index: number) => {
    const target = items[index];
    if (target?.isWon) return; // cannot remove a won item
    if (items.length <= MIN_ITEMS) return;
    onChange(renumber(items.filter((_, i) => i !== index)));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(renumber(next));
  };

  const setImage = (index: number, slot: number, url: string) => {
    const cur = items[index];
    const nextImgs = [...(cur.images ?? [])];
    nextImgs[slot] = url;
    update(index, { images: nextImgs.filter(Boolean) });
  };

  const handleVideoFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
    itemNumber: number,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadVideo) return;
    void onUploadVideo(file, itemNumber).then((url) => {
      update(index, { video: { url } });
    });
  };

  const removeImage = (index: number, slot: number) => {
    const cur = items[index];
    const nextImgs = (cur.images ?? []).filter((_, i) => i !== slot);
    update(index, { images: nextImgs });
  };

  return (
    <Stack gap="md">
      <Row justify="between" align="center">
        <Heading level={3}>Prize Items ({items.length})</Heading>
        <Button
          type="button"
          variant="secondary"
          onClick={addItem}
          disabled={anyWon || items.length >= MAX_ITEMS}
        >
          + Add prize ({items.length}/{MAX_ITEMS})
        </Button>
      </Row>
      <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
        Add between {MIN_ITEMS} and {MAX_ITEMS} prizes. Each entry will reveal
        exactly one of these. Items marked won during a prior reveal cannot be
        edited or removed.
      </Text>
      {anyWon ? (
        <Div className="border border-error/40 px-3 text-sm" color="error" surface="danger-surface" padding="y-xs" rounded="default">
          <Span weight="bold">Draw locked.</Span> At least one prize has been revealed —
          this listing can no longer be edited. To run a similar draw, clone it
          into a new prize-draw listing.
        </Div>
      ) : warning ? (
        <Div className={CLS_WARN_BOX}>
          {warning}
        </Div>
      ) : null}

      <Stack gap="md">
        {items.map((it, index) => {
          const locked = it.isWon || anyWon;
          return (
            <Div
              key={`prize-item-${it.itemNumber}-${index}`}
              className={`relative border border-[var(--appkit-color-border)] ${ locked ? "opacity-60" : "" }`} rounded="lg" padding="md"
            >
              {locked ? (
                <Row className="absolute inset-0 z-10 bg-black/10 dark:bg-black/40 pointer-events-none" align="center" justify="center" rounded="lg">
                  <Text className={CLS_WON_BADGE}>
                    Won — locked
                  </Text>
                </Row>
              ) : null}

              <Row justify="between" align="center" className="mb-3">
                <Heading level={4}>Prize #{it.itemNumber}</Heading>
                <Row gap="xs">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => move(index, -1)}
                    disabled={locked || index === 0}
                    aria-label="Move up"
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => move(index, 1)}
                    disabled={locked || index === items.length - 1}
                    aria-label="Move down"
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => removeItem(index)}
                    disabled={locked || items.length <= MIN_ITEMS}
                  >
                    Remove
                  </Button>
                </Row>
              </Row>

              <Stack gap="sm">
                <FormField
                  name={`item-${index}-title`}
                  label="Title"
                  type="text"
                  value={it.title}
                  onChange={(v) => update(index, { title: v })}
                  disabled={locked}
                  placeholder="e.g. PSA 9 Charizard Base Set Holo"
                />
                <FormField
                  name={`item-${index}-description`}
                  label="Description (optional)"
                  type="textarea"
                  value={it.description ?? ""}
                  onChange={(v) => update(index, { description: v })}
                  disabled={locked}
                  placeholder="What makes this prize special?"
                />
                <Row gap="md">
                  <Div className="flex-1">
                    <FormField
                      name={`item-${index}-condition`}
                      label="Condition"
                      type="select"
                      value={it.condition}
                      onChange={(v) => update(index, { condition: v })}
                      disabled={locked}
                      options={CONDITION_OPTIONS}
                    />
                  </Div>
                  <Div className="flex-1">
                    <FormField
                      name={`item-${index}-value`}
                      label="Estimated value (₹)"
                      type="number"
                      value={
                        it.estimatedValue != null
                          ? String(Math.round(it.estimatedValue / 100))
                          : ""
                      }
                      onChange={(v) =>
                        update(index, {
                          estimatedValue: Math.round((parseFloat(v) || 0) * 100),
                        })
                      }
                      disabled={locked}
                      placeholder="2999"
                    />
                  </Div>
                </Row>

                {/* Image slots (min 1, max 2) */}
                <Stack gap="xs">
                  <Text size="sm" weight="medium">
                    Images ({(it.images ?? []).length}/{MAX_IMAGES_PER_ITEM})
                  </Text>
                  <Row gap="sm" wrap>
                    {Array.from({ length: MAX_IMAGES_PER_ITEM }).map((_, slot) => {
                      const existing = (it.images ?? [])[slot];
                      return (
                        <Div key={slot} className="w-40">
                          <ImageUpload
                            currentImage={existing}
                            label={existing ? "Replace" : `Image ${slot + 1}`}
                            onUpload={(file) =>
                              onUploadImage(file, it.itemNumber)
                            }
                            onChange={(url) => setImage(index, slot, url)}
                          />
                          {existing && !locked ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeImage(index, slot)}
                            >
                              Remove
                            </Button>
                          ) : null}
                        </Div>
                      );
                    })}
                  </Row>
                </Stack>

                {/* Optional video */}
                {onUploadVideo ? (
                  <Stack gap="xs">
                    <Text size="sm" weight="medium">Video (optional)</Text>
                    <input
                      type="file"
                      accept="video/*"
                      disabled={locked}
                      onChange={(e) => handleVideoFileChange(e, index, it.itemNumber)}
                    />
                    {it.video?.url ? (
                      <Text className="text-[var(--appkit-color-text-muted)] truncate" size="xs">
                        Current: {it.video.url}
                      </Text>
                    ) : null}
                  </Stack>
                ) : null}
              </Stack>
            </Div>
          );
        })}
      </Stack>

      {items.length < MIN_ITEMS ? (
        <Div className="border border-error/40 px-3 text-sm" color="error" surface="danger-surface" padding="y-xs" rounded="default">
          At least {MIN_ITEMS} prizes are required.
        </Div>
      ) : null}
    </Stack>
  );
}

export default PrizeDrawItemsEditor;
