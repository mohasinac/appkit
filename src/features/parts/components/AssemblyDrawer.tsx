"use client";

/**
 * D13 — build a complete bey from parts you already hold, or break one down.
 *
 * ── 🛑 THE SLOT SET COMES FROM THE MODEL, NOT FROM A FIXED FIELD LIST ──────
 *
 * The rows are whatever `modelComposition` says this model's slots are, which
 * is why the composition had to exist first: an HMS bey has a Running Core
 * where a Plastic-Gen bey has a separate Spin Gear and Blade Base, and a 4D bey
 * has a combined bottom. A hard-coded five-row form could not express either.
 *
 * When the model has no recorded composition the drawer still works — the
 * seller adds free rows — because 37 of 259 compositions did not join to a
 * category and a seller holding those parts should not be blocked by our data
 * gap.
 *
 * ── 🛑 IT SHOWS AVAILABLE, NOT STOCK, AND SAYS WHY ────────────────────────
 *
 * The server gates on `availableQuantity`: a component with 10 in stock and 3
 * reserved has SEVEN assemblable. So the picker shows the available figure and
 * labels it, because a seller looking at "10 in stock" and being refused at 8
 * would read that as a bug. The client never decides — it previews what the
 * server will say.
 *
 * ── 🛑 IT IS A `<SectionForm>`, NOT A HAND-ROLLED FORM ────────────────────
 *
 * `audit-form-sectionised` caught the first version rendering `FieldSelect` and
 * `FieldInput` directly, and it was right: a hand-rolled form gets no
 * `FormShellContext`, so no `aria-invalid` wiring, no error summary, no
 * jump-to-field and no pinned mobile action bar.
 *
 * The slots are DATA (one row per `modelComposition` slot), so
 * `buildSectionsFromSchema` cannot express them — but `SectionDef.render` can,
 * and `SectionForm` takes explicit sections. So this is a real adoption rather
 * than a marker: the dynamic rows live inside one `render` slot and the form
 * machinery is inherited. A suppression here would have hidden the violation
 * instead of removing it (Root Cause #22).
 *
 * ── 🛑 AND IT REPORTS THE ARITHMETIC AFTERWARDS ───────────────────────────
 *
 * The route returns `before` / `after` / `taken` per component, and this
 * renders all three. A toast reading "built 2" is the shape of silent
 * wrongness this codebase keeps paying for: it is indistinguishable from a
 * build that consumed the wrong parts.
 */
import React from "react";
import {
  SideDrawer,
  Stack,
  Row,
  Div,
  Heading,
  Text,
  Button,
  Badge,
  FieldInput,
  FieldSelect,
} from "../../../ui";
import { SectionForm, type SectionDef } from "../../shell/SectionForm";
import { PART_SLOT_LABEL, type ModelCompositionDocument } from "../schemas/firestore";
import { normalizeError } from "../../../errors/normalize";
import {
  trackError,
  ErrorCategory,
  ErrorSeverity,
} from "../../../monitoring/error-tracking";

/** A part listing the seller holds, as the picker needs it. */
export interface AssemblyPartOption {
  productId: string;
  title: string;
  /** 🛑 AVAILABLE, not stock. The server gates on this. */
  availableQuantity: number;
  colourway?: string;
  /** The `partGlossary` id, so a row can be pre-matched to its slot. */
  partGlossaryId?: string;
  slotKey?: string;
}

export interface AssemblyRow {
  slotKey: string;
  slotLabel: string;
  /** Empty until the seller picks a part listing. */
  productId: string;
  quantity: number;
  /** The part name the composition expects, as a hint. */
  expectedPartName?: string;
}

/** What the route sends when a 409 names a shortfall. */
export interface AssemblyErrorDetail {
  code?: string;
  kind?: "component" | "part-out";
  productId?: string;
  needs?: number;
  has?: number;
}

export interface AssemblyOutcome {
  unitsBuilt: number;
  consumed: Array<{ productId: string; before: number; after: number; taken: number }>;
}

export interface AssemblyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  direction: "assemble" | "part-out";
  /** The complete-bey listing being built or broken down. */
  targetTitle: string;
  /** Its own available figure — a part-out cannot exceed it. */
  targetAvailable?: number;
  /** The model's composition, when one is recorded. */
  compositions: readonly ModelCompositionDocument[];
  /** Part listings the seller holds. */
  options: readonly AssemblyPartOption[];
  /** Resolves to the route's result, or throws with a readable message. */
  onSubmit: (input: {
    direction: "assemble" | "part-out";
    components: Array<{ slotKey: string; productId: string; quantity: number }>;
    units: number;
  }) => Promise<AssemblyOutcome>;
}

const MAX_COMPONENTS = 8;

/** Rows seeded from the model's own slots, pre-matched where possible. */
function seedRows(
  compositions: readonly ModelCompositionDocument[],
  options: readonly AssemblyPartOption[],
): AssemblyRow[] {
  const slots = compositions[0]?.slots ?? [];
  if (slots.length === 0) {
    return [{ slotKey: "", slotLabel: "", productId: "", quantity: 1 }];
  }
  return slots.slice(0, MAX_COMPONENTS).map((s) => {
    /*
     * Pre-match on the glossary id when the seller's listing declares one —
     * that is what `partGlossaryId` on a product is FOR. Falls back to nothing
     * rather than to a name guess: picking the wrong part for the seller is
     * worse than making them pick.
     */
    const hit = s.partId
      ? options.find((o) => o.partGlossaryId === s.partId && o.availableQuantity > 0)
      : undefined;
    return {
      slotKey: s.slotKey,
      slotLabel: PART_SLOT_LABEL[s.slotKey] ?? s.slotKey,
      productId: hit?.productId ?? "",
      quantity: 1,
      expectedPartName: s.partName,
    };
  });
}

export function AssemblyDrawer({
  isOpen,
  onClose,
  direction,
  targetTitle,
  targetAvailable,
  compositions,
  options,
  onSubmit,
}: AssemblyDrawerProps) {
  const isAssemble = direction === "assemble";
  const [rows, setRows] = React.useState<AssemblyRow[]>(() => seedRows(compositions, options));
  const [units, setUnits] = React.useState(1);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [outcome, setOutcome] = React.useState<AssemblyOutcome | null>(null);

  // Re-seed when the drawer opens on a different listing.
  React.useEffect(() => {
    if (isOpen) {
      setRows(seedRows(compositions, options));
      setUnits(1);
      setError(null);
      setOutcome(null);
    }
  }, [isOpen, compositions, options]);

  const byId = React.useMemo(
    () => new Map(options.map((o) => [o.productId, o])),
    [options],
  );

  const filled = rows.filter((r) => r.productId && r.slotKey);
  /*
   * 🛑 The SAME duplicate rule the server enforces, previewed rather than
   * duplicated as a decision: two rows for one product would each be planned
   * against the same read value and the second would overdraw, so the server
   * refuses it. Showing that here means the seller sees why before submitting.
   */
  const duplicateIds = filled
    .map((r) => r.productId)
    .filter((id, i, a) => a.indexOf(id) !== i);
  const shortfalls = isAssemble
    ? filled.filter((r) => {
        const o = byId.get(r.productId);
        return o ? o.availableQuantity < r.quantity * units : false;
      })
    : [];
  const overPartOut =
    !isAssemble && typeof targetAvailable === "number" && units > targetAvailable;

  const blocked =
    filled.length === 0 ||
    duplicateIds.length > 0 ||
    shortfalls.length > 0 ||
    overPartOut ||
    busy;

  const setRow = (i: number, patch: Partial<AssemblyRow>) =>
    setRows((prev) => prev.map((r, j) => (i === j ? { ...r, ...patch } : r)));

  /**
   * 🛑 The WORDS are ours; the FIGURES come from the server.
   *
   * `audit-raw-error-text` blocks rendering a thrown `.message`, and it is
   * right: this codebase once rendered a Node require stack inside the
   * "Place your bid" modal (Root Cause #86). But the one genuinely useful
   * thing about a 409 here is the NUMBERS, which no constant can carry — so
   * the server sends `{ needs, has }` as structured data and this composes the
   * sentence from authored copy around them.
   *
   * Anything without that shape falls back to one authored line and never to
   * server text.
   */
  const messageFor = (detail: AssemblyErrorDetail | null): string => {
    if (detail?.code === "ASSEMBLY_INSUFFICIENT" && typeof detail.needs === "number") {
      return detail.kind === "part-out"
        ? `Only ${detail.has} available to part out — you asked for ${detail.needs}.`
        : `A component is short: it needs ${detail.needs} and ${detail.has} are available. Restock it, or build fewer.`;
    }
    return "Could not complete that. Check the components and try again.";
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await onSubmit({
        direction,
        components: filled.map((r) => ({
          slotKey: r.slotKey,
          productId: r.productId,
          quantity: r.quantity,
        })),
        units,
      });
      setOutcome(result);
    } catch (err) {
      /*
       * `normalizeError` first, per Root Cause #31 — and its result is used for
       * REPORTING only. What the seller reads is composed by `messageFor` from
       * the structured figures, never from `e.message`.
       */
      const e = normalizeError(err);
      const detail =
        err && typeof err === "object" && "detail" in err
          ? ((err as { detail?: AssemblyErrorDetail }).detail ?? null)
          : null;
      setError(messageFor(detail));
      // The raw text still reaches the recorder, which is where it belongs.
      trackError(e.message, ErrorCategory.API, ErrorSeverity.MEDIUM, {
        component: "AssemblyDrawer",
        action: direction,
      });
    } finally {
      setBusy(false);
    }
  };

  /*
   * `SectionForm` is value-driven, and the rows are a LIST with add/remove —
   * which a flat values object cannot express. So the values object carries the
   * one genuinely scalar field (`units`) and the rows stay in local state,
   * mutated inside the section's own `render`. Stated rather than worked
   * around: pretending the list is a value would mean rebuilding it from a
   * record on every keystroke.
   */
  const formValues = React.useMemo(() => ({ units }), [units]);

  const sections: SectionDef<{ units: number }>[] = React.useMemo(
    () => [
      {
        id: "components",
        label: isAssemble ? "Components to consume" : "Components to receive",
        required: true,
        // Media-free, but the rows hold uncommitted picks, so keep it mounted.
        keepMounted: true,
        render: () => (
          <Stack gap="sm" className="min-w-0">
            {rows.map((r, i) => {
              const o = r.productId ? byId.get(r.productId) : undefined;
              const need = r.quantity * units;
              const short = isAssemble && o ? o.availableQuantity < need : false;
              return (
                <Stack
                  key={`${r.slotKey}-${i}`}
                  gap="xs"
                  padding="sm"
                  surface="card"
                  rounded="md"
                  border="subtle"
                  className="min-w-0"
                >
                  <Row justify="between" align="center" gap="sm" className="min-w-0">
                    <Text size="xs" color="muted" transform="uppercase">
                      {r.slotLabel || `Component ${i + 1}`}
                    </Text>
                    {r.expectedPartName && (
                      <Text size="xs" color="faint" className="truncate">
                        expects {r.expectedPartName}
                      </Text>
                    )}
                  </Row>
                  <FieldSelect
                    name={`component-${i}`}
                    label="Part listing"
                    value={r.productId}
                    onChange={(v) => setRow(i, { productId: v })}
                    options={[
                      { value: "", label: "— none —" },
                      ...options
                        .filter((opt) => !isAssemble || opt.availableQuantity > 0)
                        .map((opt) => ({
                          value: opt.productId,
                          // 🛑 "available", spelled out. A bare number reads as
                          // stock, and the server gates on available.
                          label: `${opt.title}${opt.colourway ? ` · ${opt.colourway}` : ""} — ${opt.availableQuantity} available`,
                        })),
                    ]}
                  />
                  <FieldInput
                    name={`qty-${i}`}
                    type="number"
                    label="Per unit"
                    value={String(r.quantity)}
                    onChange={(v) => setRow(i, { quantity: Math.max(1, Number(v) || 1) })}
                  />
                  {short && o && (
                    <Text size="xs" color="error" role="alert">
                      Needs {need}, {o.availableQuantity} available.
                    </Text>
                  )}
                </Stack>
              );
            })}
            {rows.length < MAX_COMPONENTS && (
              <Button
                variant="ghost"
                onClick={() =>
                  setRows((prev) => [
                    ...prev,
                    { slotKey: "", slotLabel: "", productId: "", quantity: 1 },
                  ])
                }
              >
                Add a component
              </Button>
            )}
          </Stack>
        ),
      },
      {
        id: "quantity",
        label: isAssemble ? "How many to build" : "How many to part out",
        required: true,
        render: () => (
          <Stack gap="xs" className="min-w-0">
            <FieldInput
              name="units"
              type="number"
              label={isAssemble ? "Units to build" : "Units to part out"}
              value={String(units)}
              onChange={(v) => setUnits(Math.max(1, Math.min(99, Number(v) || 1)))}
            />
            {duplicateIds.length > 0 && (
              <Text size="sm" color="error" role="alert">
                The same part is selected twice. Combine it into one row with the
                total quantity.
              </Text>
            )}
            {overPartOut && (
              <Text size="sm" color="error" role="alert">
                Only {targetAvailable} available to part out.
              </Text>
            )}
            {error && (
              <Text size="sm" color="error" role="alert">
                {error}
              </Text>
            )}
            {blocked && !busy && (
              <Text size="xs" color="muted">
                {/* Says WHY the button is disabled. A disabled control with no
                    reason is indistinguishable from a broken one. */}
                Pick at least one component, and clear any shortfall above.
              </Text>
            )}
          </Stack>
        ),
      },
    ],
    [
      rows,
      units,
      options,
      byId,
      isAssemble,
      duplicateIds.length,
      overPartOut,
      targetAvailable,
      error,
      blocked,
      busy,
    ],
  );

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={isAssemble ? "Assemble from parts" : "Part out"}
    >
      <Stack gap="md" className="min-w-0">
        <Stack gap="xs" className="min-w-0">
          <Heading level={3} size="base">
            {targetTitle}
          </Heading>
          <Text size="sm" color="muted">
            {isAssemble
              ? "Each component's stock goes down; this listing's goes up."
              : "This listing's stock goes down; each component's goes up."}
          </Text>
          {compositions.length === 0 && (
            <Text size="xs" color="muted">
              {/* Honest about OUR gap, not the seller's. */}
              We have no recorded part breakdown for this model, so the slots are
              blank — fill in what it is actually made of.
            </Text>
          )}
        </Stack>

        {outcome ? (
          /* ── the arithmetic, not a count ──────────────────────────────── */
          <Stack gap="sm" className="min-w-0">
            <Badge variant="success">
              {isAssemble ? "Built" : "Parted out"} {outcome.unitsBuilt}
            </Badge>
            <Stack gap="xs" className="min-w-0">
              {outcome.consumed.map((c) => (
                <Row
                  key={c.productId}
                  gap="sm"
                  align="center"
                  padding="inline"
                  surface="card"
                  rounded="md"
                  border="subtle"
                  className="min-w-0"
                >
                  <Div className="flex-1 min-w-0">
                    <Text size="sm" color="primary" className="truncate">
                      {byId.get(c.productId)?.title ?? c.productId}
                    </Text>
                  </Div>
                  <Text size="sm" color="muted" numeric className="flex-shrink-0">
                    {c.before} → {c.after}
                  </Text>
                </Row>
              ))}
            </Stack>
            <Button onClick={onClose}>Done</Button>
          </Stack>
        ) : (
          /*
           * ONE section holding the dynamic rows. `SectionForm` owns the
           * FormShellContext, the error summary and the pinned mobile action
           * bar; the rows themselves are data, so they live in `render`.
           */
          <SectionForm
            sections={sections}
            values={formValues}
            onChange={() => {
              /*
               * The rows are held in local state because they are a LIST with
               * add/remove, which a flat values object cannot express. This
               * handler exists so `SectionForm`'s contract is satisfied; every
               * real mutation goes through `setRow` / `setRows` inside the
               * section's own render.
               */
            }}
            onSubmit={submit}
            submitLabel={isAssemble ? "Build" : "Part out"}
            isLoading={busy}
            onCancel={onClose}
            cancelLabel="Cancel"
          />
        )}
      </Stack>
    </SideDrawer>
  );
}
