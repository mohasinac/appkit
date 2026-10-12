"use client";

/**
 * The seller form's category description-template picker — C2c.
 *
 * Fills `SellerProductShell`'s `renderTemplateSelector` slot, which existed
 * with zero consumers until C2b widened it (Root Cause #8's shape: a slot
 * shell rendered with no render props shows a layout skeleton and no content).
 *
 * ## What it is for
 *
 * Our sellers write every description from scratch because no
 * category→description mechanism has ever existed. The competitor crawl shows
 * the model: worldhobbyshop reuses TWO bodies across 1,195 listings — a
 * pre-owned disclosure and a new-in-box spec block — and tcgindia generates
 * five templated FAQs per product. The bodies live on the CATEGORY, so fixing
 * the copy fixes every future listing at once.
 *
 * ## 🛑 The clobber rule is the whole design
 *
 * `isDescriptionDirty` arrives from the shell: non-empty after trim AND not
 * byte-identical to a body applied this session. When it is false the picker
 * may fill silently — the seller is looking at either an empty box or our own
 * text. When it is TRUE it must not overwrite; it offers **Replace
 * description** instead, which is destructive and therefore carries a
 * `confirmation` on its ActionDef (Rule #7), not a `window.confirm`.
 *
 * ## 🛑 "No template" must never blank the field
 *
 * A category with no body at any ancestor renders "No template yet" and leaves
 * whatever is in the box alone. Blanking a field to signal absence is how a
 * seller loses work to a feature that was trying to help.
 */

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Div, Row, Stack, Text } from "../../../ui";
import { apiClient } from "../../../http";
import { CATEGORY_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { interpolate } from "../../../_internal/shared/templating/placeholders";
import type {
  CategoryDescriptionTemplate,
  CategorySpecification,
  CategoryTemplateVariant,
} from "../schemas/category-content";

const PANEL_CLASS =
  "rounded-lg border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] px-[var(--appkit-space-3)] py-[var(--appkit-space-3)]";

/** What the picker may apply to the draft. Deliberately narrow. */
export interface CategoryTemplateApply {
  description?: string;
  appliedTemplateId?: string;
  appliedTemplateBody?: string;
}

export interface CategoryTemplatePickerProps {
  /** The leaf the seller has chosen. Empty until they pick one. */
  categoryId: string;
  /** The raw `condition` enum from the draft — mapped to a variant below. */
  condition: string;
  /** Resolved `{{slot}}` values, supplied by the shell. */
  context: Record<string, string>;
  /** True when the seller has authored text we must not overwrite. */
  isDescriptionDirty: boolean;
  onApply: (partial: CategoryTemplateApply) => void;
}

interface TemplateResponse {
  template: (CategoryDescriptionTemplate & { placeholders?: string[] }) | null;
  inheritedFrom: string | null;
  inheritedFromName: string | null;
  /**
   * D12 — slot values the client cannot compute, from the server.
   *
   * `{{partBreakdown}}` is a Firestore read against the leaf's
   * `modelComposition`, so the form has no way to resolve it. Absent when the
   * body does not ask for it; absent ALSO when it asks and the model has no
   * recorded composition — in that case the server has already stripped the
   * line from `body`, so there is nothing left to fill.
   */
  slots?: Record<string, string>;
  defaults: {
    specifications?: CategorySpecification[];
    inTheBox?: string[];
    defaultCondition?: string;
    defaultAuthenticity?: string;
    seoKeywords?: string[];
    faqTemplates?: { question: string; answer: string }[];
  };
}

/**
 * Which body a condition wants.
 *
 * 🛑 The variants are the conditions that change what the copy must SAY, not
 * every `CONDITION_OPTIONS` value — a "pre-owned" and a "used" listing want
 * the same disclosure paragraph, which is why `CategoryTemplateVariant` has
 * five members against the form's six conditions.
 *
 * `refurbished` maps to `pre_owned` rather than `default`: it has been owned
 * and worked on, so the disclosure applies. Mapping it to `default` would hand
 * a refurbished item a brand-new-item body, which is the one wrong answer
 * available here.
 */
export function variantForCondition(condition: string): CategoryTemplateVariant {
  switch (condition) {
    case "new":
      return "new_in_box";
    case "like_new":
    case "good":
    case "fair":
    case "used":
    case "refurbished":
      return "pre_owned";
    default:
      return "default";
  }
}

function unwrap(res: unknown): TemplateResponse | null {
  const body =
    (res as { data?: TemplateResponse })?.data ?? (res as TemplateResponse);
  return body && typeof body === "object" && "template" in body ? body : null;
}

/** "2 of 9 slots could not be filled: {{year}}, {{type}}" */
function unresolvedNote(unresolved: string[], total: number): string | null {
  if (unresolved.length === 0) return null;
  const named = unresolved.map((n) => `{{${n}}}`).join(", ");
  return `${unresolved.length} of ${total} slots could not be filled: ${named}`;
}

/** "adds 2 specification rows · sets condition to Used" */
function describeDefaults(defaults: TemplateResponse["defaults"]): string[] {
  const parts: string[] = [];
  const specs = defaults.specifications?.length ?? 0;
  if (specs > 0) parts.push(`${specs} specification row${specs === 1 ? "" : "s"}`);
  const box = defaults.inTheBox?.length ?? 0;
  if (box > 0) parts.push(`a "what's in the box" list of ${box}`);
  const kw = defaults.seoKeywords?.length ?? 0;
  if (kw > 0) parts.push(`${kw} SEO keyword${kw === 1 ? "" : "s"}`);
  const faqs = defaults.faqTemplates?.length ?? 0;
  if (faqs > 0) parts.push(`${faqs} listing FAQ${faqs === 1 ? "" : "s"}`);
  return parts;
}

export function CategoryTemplatePicker({
  categoryId,
  condition,
  context,
  isDescriptionDirty,
  onApply,
}: CategoryTemplatePickerProps) {
  const variant = variantForCondition(condition);

  /*
   * Keyed on (category, variant) — the same pair the endpoint's edge cache is
   * keyed on, so switching back to a condition the seller already looked at
   * costs nothing at all. Fired on change, never per keystroke: `condition` is
   * a select and `categoryId` comes from a picker.
   */
  const query = useQuery({
    queryKey: ["category-description-template", categoryId, variant],
    enabled: categoryId.length > 0,
    staleTime: 60 * 60 * 1000,
    queryFn: async () =>
      unwrap(
        await apiClient.get(
          CATEGORY_ENDPOINTS.DESCRIPTION_TEMPLATE(categoryId, variant),
        ),
      ),
  });

  const data = query.data ?? null;
  const template = data?.template ?? null;

  /*
   * Interpolated here rather than on apply, so the unresolved-slot note is
   * accurate BEFORE the seller commits. A note that appears only after the
   * text lands is a report on something they can no longer choose about.
   */
  /*
   * 🛑 Server slots merge UNDERNEATH the form's context, so a draft-derived
   * value always wins. The two key spaces are disjoint today — the form knows
   * the listing, the server knows the category — and this ordering is what
   * keeps it safe if they ever overlap: the more specific source is the one
   * holding the item in front of the seller.
   */
  const resolved = React.useMemo(
    () => ({ ...(data?.slots ?? {}), ...context }),
    [data?.slots, context],
  );

  const filled = React.useMemo(
    () => (template ? interpolate(template.body, resolved) : null),
    [template, resolved],
  );

  /*
   * Auto-fill when the seller owns nothing. Deliberately an effect rather than
   * a render-time write: the body has to reach the draft, which is the
   * shell's state.
   *
   * 🛑 Guarded on `isDescriptionDirty` reading FALSE, which covers all three
   * silent cases the plan specifies — never touched, cleared, or still showing
   * a body we applied. The seller who typed one character gets the button
   * instead.
   *
   * `filled.text` is in the dependency list, so changing the category or the
   * condition refreshes a body we own. That is the "Updated for Burst Dual
   * Layer" case, and it is the reason this is not a one-shot.
   */
  const applied = data && template && filled;
  React.useEffect(() => {
    if (!applied || isDescriptionDirty) return;
    onApply({
      description: filled.text,
      appliedTemplateId: template.id,
      appliedTemplateBody: filled.text,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied, isDescriptionDirty, filled?.text, template?.id]);

  if (categoryId.length === 0) return null;

  if (query.isLoading) {
    return (
      <Div className={PANEL_CLASS}>
        <Text size="xs" color="muted">
          Looking for a description template for this category…
        </Text>
      </Div>
    );
  }

  /*
   * 🛑 A failed fetch says so, and does NOT fall through to "No template yet".
   * Those are different facts, and conflating them is Root Cause #72's rule
   * one level out: absence must never be reported as a measured zero.
   */
  if (query.isError) {
    return (
      <Div className={PANEL_CLASS}>
        <Text size="xs" color="muted">
          Could not load the category's description template. Your description
          is untouched — write your own, or try again in a moment.
        </Text>
      </Div>
    );
  }

  if (!data || !template || !filled) {
    return (
      <Div className={PANEL_CLASS}>
        <Text size="xs" color="muted">
          No description template for this category yet — write your own, and an
          admin can add one so the next listing starts from it.
        </Text>
      </Div>
    );
  }

  const note = unresolvedNote(
    filled.unresolved,
    template.placeholders?.length ?? filled.unresolved.length,
  );
  const extras = describeDefaults(data.defaults);
  const source = data.inheritedFromName
    ? `Inherited from ${data.inheritedFromName}`
    : "From this category";

  return (
    <Div className={PANEL_CLASS}>
      <Stack gap="xs">
        <Row gap="sm" align="center" justify="between" wrap>
          <Stack gap="xs">
            <Text size="sm" weight="semibold">
              {template.label}
            </Text>
            <Text size="xs" color="muted">
              {source}
              {isDescriptionDirty ? "" : " · applied"}
            </Text>
          </Stack>
          {isDescriptionDirty ? (
            <Button
              action={ACTIONS.STORE["replace-description"]}
              size="sm"
              onClick={() =>
                onApply({
                  description: filled.text,
                  appliedTemplateId: template.id,
                  appliedTemplateBody: filled.text,
                })
              }
            />
          ) : null}
        </Row>
        {note ? (
          <Text size="xs" color="muted">
            {note}
          </Text>
        ) : null}
        {extras.length > 0 ? (
          <Text size="xs" color="muted">
            This category also supplies {extras.join(", ")} when you save.
          </Text>
        ) : null}
        {isDescriptionDirty ? (
          <Text size="xs" color="muted">
            Your own description is kept — nothing was overwritten.
          </Text>
        ) : null}
      </Stack>
    </Div>
  );
}
