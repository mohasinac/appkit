/**
 * D12 — what a bey is MADE OF, rendered on its model page and its listings.
 *
 * The corpus knows the composition of 259 models down to the slot, with a
 * per-part weight on 98 of them. Until this existed that data had no reader,
 * and a buyer reading "Storm Pegasus 105RF" had no way to learn that `105` is
 * a spin-track height and `RF` is a rubber flat tip.
 *
 * ── 🛑 THE SLOT SET IS DATA, AND IT MERGES ─────────────────────────────────
 *
 * Nothing here enumerates slots. A `Record<Generation, Slot[]>` cannot express
 * what the corpus actually contains — `Spin Gear + Blade Base → RUNNING CORE`
 * (HMS) and `SPIN TRACK + TIP combined: F:D` (4D) — so the rows are whatever
 * the document carries, in the order it carries them, and `slotMerges` is
 * rendered as a note rather than being flattened away. A system with a
 * combined module genuinely has fewer rows, and padding it to a fixed five
 * would claim a part that does not exist.
 *
 * ── 🛑 NO MONEY ON THIS PANEL ──────────────────────────────────────────────
 *
 * It renders on a PUBLIC page, so a price here would need `<GatedPrice>` and
 * would make a server component a client one. A part's own page carries its
 * listings; this panel carries facts about mouldings. There is nothing to gate
 * because there is nothing to leak.
 */
import React from "react";
import { Stack, Row, Div, Heading, Text, Span, TextLink, Badge } from "../../../ui";
import {
  PART_SLOT_LABEL,
  type ModelCompositionDocument,
  type ModelSlot,
  type PartGlossaryDocument,
} from "../schemas/firestore";

export interface ModelCompositionPanelProps {
  compositions: readonly ModelCompositionDocument[];
  /** Glossary rows for the slots' `partId`s, so a row can link and show weight. */
  parts?: Map<string, PartGlossaryDocument>;
  /** `(slot, codeOrName)` → the part's page. Supplied by the consumer's route map. */
  hrefForPart: (slot: string, tail: string) => string;
  /** Heading level, so this sits correctly inside a tab or a page section. */
  headingLevel?: 2 | 3 | 4;
}

/** `performance-tip--rf` → `rf`. The id's tail IS the URL segment. */
function tailOf(partId: string): string {
  const i = partId.indexOf("--");
  return i >= 0 ? partId.slice(i + 2) : partId;
}

/**
 * One slot row.
 *
 * Extracted because `audit-code-quality` flagged the inline version at
 * brace-depth 6, and it was right — "for each composition, for each slot, if
 * the part resolved, if a weight exists" is four questions in one block, and
 * the nesting is what hides the two judgements this row actually makes: which
 * weight wins, and whether the corpus's own slot label adds anything.
 */
function SlotRow({
  slot,
  part,
  hrefForPart,
}: {
  slot: ModelSlot;
  part?: PartGlossaryDocument;
  hrefForPart: (slot: string, tail: string) => string;
}) {
  // The slot's own figure wins over the glossary's: a composition records the
  // weight of the part AS FITTED, and a glossary row records the mould.
  const weight = slot.weightG ?? part?.weightG;
  const canonical = PART_SLOT_LABEL[slot.slotKey] ?? slot.slotKey;
  const showCorpusLabel =
    Boolean(slot.slotLabel) && slot.slotLabel.toLowerCase() !== canonical.toLowerCase();

  return (
    <Row
      gap="md"
      align="start"
      padding="inline"
      surface="card"
      rounded="md"
      border="subtle"
      className="min-w-0"
    >
      <Div className="w-36 flex-shrink-0">
        <Text size="xs" color="muted" transform="uppercase">
          {canonical}
        </Text>
        {/* The corpus's OWN term, kept because it is what is printed on the
            packaging the buyer is holding — "METAL ATTACK RING (MAR)" is not a
            tidier spelling of "Attack Ring", it is the label. */}
        {showCorpusLabel && (
          <Text size="xs" color="faint">
            {slot.slotLabel}
          </Text>
        )}
      </Div>
      <Div className="flex-1 min-w-0">
        {slot.partId ? (
          <TextLink href={hrefForPart(slot.slotKey, tailOf(slot.partId))}>
            {slot.partName}
          </TextLink>
        ) : (
          <Text color="primary">{slot.partName}</Text>
        )}
        {typeof weight === "number" && (
          <Span size="xs" color="muted">
            {" "}
            · {weight} g
          </Span>
        )}
      </Div>
    </Row>
  );
}

export function ModelCompositionPanel({
  compositions,
  parts,
  hrefForPart,
  headingLevel = 3,
}: ModelCompositionPanelProps) {
  if (compositions.length === 0) return null;

  return (
    <Stack gap="lg" className="min-w-0">
      {compositions.map((comp) => {
        const slots = comp.slots ?? [];
        const merges = comp.slotMerges ?? [];
        return (
          <Stack key={comp.id} gap="sm" className="min-w-0">
            {/* Several compositions under one model is a real state — a remake
                shares the name and not the parts — so each is labelled rather
                than silently concatenated into one list. */}
            {compositions.length > 1 && (
              <Heading level={headingLevel}>{comp.name}</Heading>
            )}

            <Row gap="xs" wrap align="center" className="min-w-0">
              {comp.system && <Badge variant="default">{comp.system}</Badge>}
              {comp.series && <Badge variant="default">{comp.series}</Badge>}
              {comp.productCode && <Badge variant="info">{comp.productCode}</Badge>}
            </Row>

            {slots.length === 0 ? (
              <Text color="muted" size="sm">
                {/* An honest absence. A model with no recorded breakdown is one
                    of the 49 the corpus does not describe, not a model with no
                    parts — and saying "no parts" would be false. */}
                No part breakdown recorded for this model yet.
              </Text>
            ) : (
              <Stack gap="xs" className="min-w-0">
                {slots.map((s, i) => (
                  <SlotRow
                    key={`${comp.id}-${s.slotKey}-${i}`}
                    slot={s}
                    part={s.partId ? parts?.get(s.partId) : undefined}
                    hrefForPart={hrefForPart}
                  />
                ))}
              </Stack>
            )}

            {merges.length > 0 && (
              <Text size="xs" color="muted">
                {merges.map((m, i) => (
                  <Span key={i}>
                    {i > 0 ? " · " : ""}
                    {m.merges.map((x) => PART_SLOT_LABEL[x] ?? x).join(" + ")} are one
                    moulded module here ({PART_SLOT_LABEL[m.into] ?? m.into}).
                  </Span>
                ))}
              </Text>
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}
