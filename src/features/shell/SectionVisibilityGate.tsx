"use client";
import { Div } from "../../ui/components/Div";
import { Icon } from "../../ui/components/Icon";
import { IconButton } from "../../ui/components/IconButton";
import { Row } from "../../ui/components/Layout";
import { Text } from "../../ui/components/Typography";
import { useEditMode } from "../../_internal/client/edit-mode/EditModeProvider";
import { useFieldVisibility } from "./useFieldVisibility";

export interface SectionVisibilityGateProps {
  /** Stable, hand-chosen surface id — same convention `useFieldVisibility` already uses for forms. One surface can gate several section keys at once. */
  surfaceId: string;
  /** Which key within that surface this section is gated by. */
  sectionKey: string;
  /** Server-rendered initial value (`getFieldVisibility(surfaceId)[sectionKey] !== false`) — required so a real visitor's first paint never shows a section that's about to be hidden client-side. */
  initialVisible: boolean;
  children: React.ReactNode;
}

/**
 * The read-only-DISPLAY half of the field-visibility mechanism
 * `useFieldVisibility.ts`'s own doc comment already promises:
 * *"One mechanism covering BOTH a form INPUT field... AND a DISPLAY field
 * on a read-only page... the CALLER decides whether a `false` gates an
 * `<FieldInput>` render or a `<Text>` display row."* `build-sections.tsx`'s
 * `fieldVisibility` option is the FORM half (wired into `StoreCreateForm`/
 * the payout-method form); this is the DISPLAY half, for a whole rendered
 * SECTION rather than a single field — same storage, same admin toggle
 * shape, same "admin sees it dimmed in edit mode, everyone else never
 * sees it when off" rule as `FieldVisibilityEditWrapper`.
 *
 * Deliberately generic — not PDP-specific — so the SAME component gates
 * any "is this whole block of a page visible" decision site-wide, per the
 * owner's own framing: "all of the whole website parts is made of
 * widgets... enabled disabled with tags and content from the admin."
 *
 * Unlike `buildSectionsFromSchema`'s `fieldVisibility` option (which
 * fetches nothing itself — the FORM already holds the whole map), this
 * component calls `useFieldVisibility` directly per mount, since a page's
 * sections aren't threaded through one shared options object the way a
 * form's fields are. `useFieldVisibility`'s own fetch-on-mount path is
 * skipped here because `initialVisible` is always supplied (SSR, not a
 * `"use client"` page with no fetch opportunity) — same "pass `initial` to
 * skip the fetch" contract `StoreCreateForm` could use but doesn't.
 */
export function SectionVisibilityGate({ surfaceId, sectionKey, initialVisible, children }: SectionVisibilityGateProps) {
  const { editMode } = useEditMode();
  const initial = { [sectionKey]: initialVisible };
  const { fields, setVisible } = useFieldVisibility(surfaceId, initial);
  const visible = fields[sectionKey] !== false;

  if (!editMode && !visible) return null;

  if (!editMode) return <>{children}</>;

  return (
    <Div className={visible ? undefined : "opacity-50"}>
      <Row gap="xs" align="center" justify="end" className="mb-1">
        {!visible && (
          <Text size="xs" color="muted">
            Hidden from the page
          </Text>
        )}
        <IconButton
          aria-label={visible ? `Hide the ${sectionKey} section` : `Show the ${sectionKey} section`}
          icon={<Icon name={visible ? "view" : "hide"} size="sm" />}
          size="sm"
          variant="ghost"
          onClick={() => setVisible(sectionKey, !visible)}
        />
      </Row>
      {children}
    </Div>
  );
}
