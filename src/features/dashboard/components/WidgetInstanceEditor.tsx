"use client";

import { useCallback, useState } from "react";
import { Button } from "../../../ui/components/Button";
import { Div } from "../../../ui/components/Div";
import { Icon } from "../../../ui/components/Icon";
import { IconButton } from "../../../ui/components/IconButton";
import { Row, Stack } from "../../../ui/components/Layout";
import { Text } from "../../../ui/components/Typography";
import { useEditMode } from "../../../_internal/client/edit-mode/EditModeProvider";
import type { ResolvedWidget, WidgetInstance } from "../../../ui/widgets/types";
import type { ReactNode } from "react";

/**
 * In-place widget editing — the owner's requirement, 2026-11-08:
 * *"i need a homepage edit mode as well where the admin can flip a toggle on
 * the navbar to edit the site in place"*.
 *
 * ---------------------------------------------------------------------------
 * 🛑 THIS IS NOT A NEW EDIT MODE. IT EXTENDS THE ONE THAT ALREADY EXISTS.
 * ---------------------------------------------------------------------------
 *
 * The toggle and its state machine were already built and already mounted:
 *   - `_internal/client/edit-mode/EditModeProvider.tsx` — the state, with
 *     `canUseEditMode` already driving whether a toggle renders at all, and
 *     `enabled` already forcing `editMode` to false for a session that may
 *     not edit ("a buyer cannot reach edit affordances by any client-side
 *     code path").
 *   - `edit-mode/index.ts` — its canonical PUBLIC barrel. It is a 12-line
 *     re-export, deliberately, mirroring `hand-mode/index.ts` so
 *     `audit-appkit-reexports` (no `_internal/` in public barrels) stays
 *     green. 🚩 It is NOT an unimplemented stub, and nothing new should be
 *     homed in it.
 *   - `features/layout/EditModeToggle.tsx` — the navbar/titlebar toggle,
 *     mounted via `TitleBarLayout`'s `editModeSlot` from
 *     `LayoutShellClient.tsx`.
 *   - `AdminComposableRegion` and `SectionVisibilityGate` already consume
 *     `useEditMode()` and already render the dimmed "hidden" affordance.
 *
 * So the missing piece was never the toggle — it was that a resolved WIDGET
 * INSTANCE had no in-place affordance. That is all this component adds.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT ENFORCES, AND WHY EACH ONE IS NOT OPTIONAL
 * ---------------------------------------------------------------------------
 *
 * 1. `removable: false` is REFUSED WITH A REASON, never silently no-opped.
 *    An in-place editor is precisely where someone tries to delete the price,
 *    and A16 is explicit: price, condition, authenticity, the risk banner and
 *    consent "may be restyled, never hidden". A disabled button with no
 *    explanation reads as a broken UI; a button that appears to work and does
 *    nothing is worse.
 *
 * 2. A child inside a BLOCKED PARENT is shown as unreachable, and its
 *    "enable" is refused. The owner ruled parent-wins, and the rationale was
 *    that switching a region off must GUARANTEE it is gone because this sits
 *    next to permissions. Letting someone flip a child to `on` and believe it
 *    worked would quietly break that guarantee — so the editor says
 *    "its container is off" instead of pretending.
 *
 * 3. It states, on screen, that an edit is TEMPLATE-WIDE. This is the
 *    invariant the whole cost model rests on (~5,210 keys bounded by code vs
 *    ~60,000 bounded by data). An admin editing the rail on one product page
 *    is editing it for EVERY product, and an editor that does not say so
 *    invites exactly the per-product expectation that breaks the model.
 */

export interface WidgetInstanceEditorProps {
  /** The resolved node this affordance belongs to. */
  node: ResolvedWidget;
  /** Human-readable scope, e.g. "every product page". Shown so template-wide editing is never a surprise. */
  scopeLabel: string;
  /** Persist a patch. Field-wise — see `WidgetEditPatch`. */
  onPatch: (id: string, patch: WidgetEditPatch) => Promise<void> | void;
  /** The widget's own rendered output. */
  children: ReactNode;
}

/**
 * A FIELD-WISE patch, never a whole row.
 *
 * 🛑 Omitted keys must stay untouched all the way to storage. A whole-row
 * write is the `HomepageSectionsRepository` failure, whose own comment records
 * that "every config key a caller omitted was silently deleted" behind an HTTP
 * 200 — and here the partial patch is the COMMON case (switching one rail off
 * is a single field), not an edge case.
 */
export interface WidgetEditPatch {
  state?: "on" | "off";
  order?: number;
  config?: Record<string, unknown>;
}

/** Why an edit was refused. Shown to the operator; never swallowed. */
function refusalFor(node: ResolvedWidget): string | null {
  if (node.def?.removable === false) {
    return `"${node.def.label}" cannot be removed. Price, condition, authenticity, the risk banner and consent may be restyled, never hidden. Change its styling instead.`;
  }
  if (node.reason === "parent-off") {
    return "This widget's container is switched off, so it cannot render. Enable the container first — turning this on by itself will not bring it back.";
  }
  if (node.reason === "wrong-surface") {
    return "This widget type is not available on this kind of page.";
  }
  if (node.reason === "missing-permission") {
    return "This widget is hidden from you because of its required permission, so it cannot be edited here.";
  }
  if (node.reason === "content-tag-off") {
    return "A content flag this widget depends on is switched off. Re-enable the flag, or retag the widget.";
  }
  return null;
}

export function WidgetInstanceEditor({
  node,
  scopeLabel,
  onPatch,
  children,
}: WidgetInstanceEditorProps) {
  const { editMode } = useEditMode();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const inst = node.instance;
  const refusal = refusalFor(node);
  const isOff = node.visible === false;

  const patch = useCallback(
    async (next: WidgetEditPatch) => {
      setBusy(true);
      setNotice(null);
      try {
        await onPatch(inst.id, next);
      } catch (err) {
        setNotice(err instanceof Error ? err.message : "Could not save that change.");
      } finally {
        setBusy(false);
      }
    },
    [inst.id, onPatch],
  );

  // Not editing: the widget renders exactly as it would with none of this
  // mounted. No wrapper div, no layout shift, no extra DOM for a visitor —
  // the same additive-by-construction rule `AdminComposableRegion` follows.
  if (!editMode) return <>{children}</>;

  const canToggleOff = node.def?.removable !== false;

  return (
    <Div className="relative rounded-md outline-dashed outline-1 outline-offset-4 outline-[var(--appkit-color-border)]">
      <Row gap="xs" align="center" justify="between" className="mb-1 flex-wrap">
        <Row gap="xs" align="center">
          <Text size="xs" weight="semibold" color="muted" className="uppercase tracking-widest">
            {node.def?.label ?? inst.type}
          </Text>
          {/*
            * The template-wide warning, on screen rather than in a doc.
            * An admin editing one product page is editing every product page.
            */}
          <Text size="xs" color="muted">
            · affects {scopeLabel}
          </Text>
          {node.def?.removable === false && (
            <Text size="xs" color="muted" className="uppercase tracking-widest">
              · required
            </Text>
          )}
        </Row>

        <Row gap="xs" align="center">
          <IconButton
            aria-label={isOff ? `Show ${node.def?.label ?? inst.type}` : `Hide ${node.def?.label ?? inst.type}`}
            icon={<Icon name={isOff ? "hide" : "view"} size="sm" />}
            size="sm"
            variant="ghost"
            disabled={busy || (!canToggleOff && !isOff) || node.reason === "parent-off"}
            onClick={() => {
              if (!canToggleOff && !isOff) {
                setNotice(refusal);
                return;
              }
              if (node.reason === "parent-off") {
                setNotice(refusal);
                return;
              }
              void patch({ state: isOff ? "on" : "off" });
            }}
          />
          <IconButton
            aria-label="Move earlier"
            icon={<Icon name="arrow-up" size="sm" />}
            size="sm"
            variant="ghost"
            disabled={busy || inst.order <= 0}
            onClick={() => void patch({ order: Math.max(0, inst.order - 1) })}
          />
          <IconButton
            aria-label="Move later"
            icon={<Icon name="arrow-down" size="sm" />}
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void patch({ order: inst.order + 1 })}
          />
        </Row>
      </Row>

      {/*
        * A refusal or an error is TEXT the operator can act on, in place.
        * Lane G's `validateRequiredFieldConfig` reports rather than silently
        * ignoring for exactly this reason: "Reported so the admin is not
        * misled into thinking it did."
        */}
      {notice && (
        <Text size="xs" color="danger" className="mb-1">
          {notice}
        </Text>
      )}

      {/*
        * An unreachable widget is shown dimmed WITH ITS REASON rather than
        * removed from the editor — the same "an admin can always reach what
        * they just turned off" rule `AdminComposableRegion` already states.
        */}
      {isOff ? (
        <Stack gap="xs">
          <Text size="xs" color="muted">
            {refusal ?? "Hidden — not rendered for visitors."}
          </Text>
          <Div className="opacity-40">{children}</Div>
        </Stack>
      ) : (
        children
      )}

      {busy && (
        <Text size="xs" color="muted" className="mt-1">
          Saving…
        </Text>
      )}

      {node.def?.removable === false && !isOff && (
        <Button
          variant="ghost"
          size="sm"
          type="button"
          className="mt-1"
          onClick={() => setNotice(refusal)}
        >
          Why can&rsquo;t this be removed?
        </Button>
      )}
    </Div>
  );
}

/**
 * Apply a field-wise patch to a client-held instance list, for optimistic
 * rendering before the PUT lands.
 *
 * Kept here next to the editor rather than in `ui/widgets/merge.ts` because
 * that module is the SERVER-side defaults⊕stored merge; this is the much
 * narrower "one row, one patch" case the editor needs. Same field-wise rule
 * though — `config` merges one level so a changed title keeps the row's
 * `source`.
 */
export function applyEditPatch(
  instances: readonly WidgetInstance[],
  id: string,
  patch: WidgetEditPatch,
): WidgetInstance[] {
  return instances.map((inst) => {
    if (inst.id !== id) return inst;
    const next: WidgetInstance = { ...inst };
    if (patch.state !== undefined) next.state = patch.state;
    if (patch.order !== undefined) next.order = patch.order;
    if (patch.config) next.config = { ...(inst.config ?? {}), ...patch.config };
    return next;
  });
}
