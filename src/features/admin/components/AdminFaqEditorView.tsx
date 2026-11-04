"use client";

import type { JsonValue } from "@mohasinac/appkit/client";
import { useApiMutation, ALL_LISTING_TYPES, ALL_CATEGORY_TYPES, ALL_BROWSE_PAGES } from "@mohasinac/appkit/client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ConfirmDeleteModal } from "../../../ui/components/ConfirmDeleteModal";
import { Div } from "../../../ui/components/Div";
import { Input } from "../../../ui/components/Input";
import { Repeater } from "../../../ui/components/Repeater";
import { RichTextEditor } from "../../../ui/components/RichTextEditor";
import { Select } from "../../../ui/components/Select";
import { Stack } from "../../../ui/components/Layout";
import { StackedViewShell } from "../../../ui/components/StackedViewShell";
import { TagInput } from "../../../ui/components/TagInput";
import { Textarea } from "../../../ui/components/Textarea";
import { Text } from "../../../ui/components/Typography";
import { Toggle } from "../../../ui/components/Toggle";
import { useToast } from "../../../ui/components/toast-context";
import type { StackedViewShellProps } from "../../../ui/components/StackedViewShell";
import { FieldInput, FormErrorSummary, FormShellContext, useFormShellState } from "../../../ui/forms";
import { SectionForm, useSectionFormNav } from "../../shell/SectionForm";
import type { SectionDef } from "../../shell/SectionForm";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { FAQ_CATEGORY_LABELS } from "../../faq/schemas/firestore";
import type { FAQCategory } from "../../faq/types";
import { getBrandName } from "../../../core/brand-resolver";
import { AdminComposableRegion } from "../../dashboard/components/AdminComposableRegion";
import type { DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";

/**
 * Matches the draft this form actually holds, and the payload it actually
 * sends.
 *
 * `answer` was declared as `{ text, format }` while both the state and the
 * request body are a plain HTML string — the route wraps it (see CLAUDE.md
 * Root Cause #39). Nothing ever called `validate()`, so the mismatch was
 * invisible; under `<SectionForm>`, which parses the draft on every change, it
 * would have produced a permanent error on a field the user cannot fix.
 * `.passthrough()` similarly hid seven unvalidated fields.
 */
const faqFormSchema = z.object({
  question: z.string().min(5, "Question must be at least 5 characters").max(500),
  slug: z
    .string()
    .regex(/^faq-[a-z0-9-]*$/, "Must start with 'faq-' and use lowercase letters, digits and hyphens")
    .optional()
    .or(z.literal("")),
  answer: z.string().min(1, "Answer is required"),
  category: z.string().min(1, "Category is required"),
  tags: z.array(z.string()).optional(),
  order: z.number().int().min(0).optional(),
  priority: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  showOnHomepage: z.boolean().optional(),
  showInFooter: z.boolean().optional(),
  // The form's own draft shape (`FragmentDraft`), not the wire shape sent to
  // the API — `toWireFragment` converts at submit time. Unconstrained beyond
  // its own shape: the real content boundary is the server's
  // `answerFragmentsSchema` (`.text.min(1)` etc.), and a blank added-then-
  // abandoned row here is dropped by `toWireFragment`, not rejected here.
  answerFragments: z
    .array(
      z.object({
        governsKind: z.enum(["", "listingType", "categoryType", "browsePage"]),
        governsValue: z.string(),
        text: z.string(),
        whenHidden: z.string(),
      }),
    )
    .optional(),
});

/**
 * Item 7 (2026-11-04) — the form's own draft shape for one `answerFragments`
 * row. Two string fields (`governsKind`/`governsValue`) rather than the wire
 * shape's single nested `governs?: {governs, value}` object: an empty-string
 * controlled `<Select>` pair is simpler to bind than an optional nested
 * object, and `toWireFragment`/`fromWireFragment` below are the one place
 * that converts between the two — never duplicated at the call sites.
 */
interface FragmentDraft {
  [key: string]: JsonValue;
  governsKind: "" | "listingType" | "categoryType" | "browsePage";
  governsValue: string;
  text: string;
  whenHidden: string;
}

/** Wire shape — matches `ContentFragment` (`_internal/shared/content/fragments.ts`) exactly. */
interface WireFragment {
  governs?: { governs: "listingType" | "categoryType" | "browsePage"; value: string };
  text: string;
  whenHidden?: string;
}

function blankFragment(): FragmentDraft {
  return { governsKind: "", governsValue: "", text: "", whenHidden: "" };
}

function fromWireFragment(f: WireFragment): FragmentDraft {
  return {
    governsKind: f.governs?.governs ?? "",
    governsValue: f.governs?.value ?? "",
    text: f.text ?? "",
    whenHidden: f.whenHidden ?? "",
  };
}

/** Drops a row with no text — the Zod boundary requires `text.min(1)`, and a blank added-then-abandoned row is noise, not an intended empty fragment. */
function toWireFragment(f: FragmentDraft): WireFragment | null {
  if (!f.text.trim()) return null;
  return {
    ...(f.governsKind ? { governs: { governs: f.governsKind, value: f.governsValue } } : {}),
    text: f.text.trim(),
    ...(f.whenHidden.trim() ? { whenHidden: f.whenHidden.trim() } : {}),
  };
}

const GOVERNS_KIND_OPTIONS: { value: FragmentDraft["governsKind"]; label: string }[] = [
  { value: "", label: "— Always shown —" },
  { value: "listingType", label: "Listing type" },
  { value: "categoryType", label: "Category type" },
  { value: "browsePage", label: "Browse page" },
];

function humanize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, " ");
}

/** Dropdown source per `governsKind` — the real unions, never a hand-typed list (Root Cause #61). */
function governsValueOptions(kind: FragmentDraft["governsKind"]): { value: string; label: string }[] {
  if (kind === "listingType") return ALL_LISTING_TYPES.map((t) => ({ value: t, label: humanize(t) }));
  if (kind === "categoryType") return ALL_CATEGORY_TYPES.map((t) => ({ value: t, label: humanize(t) }));
  if (kind === "browsePage") return ALL_BROWSE_PAGES.map((p) => ({ value: p, label: humanize(p) }));
  return [];
}

interface FaqFormValues {
  [key: string]: JsonValue;
  question: string;
  slug: string;
  answer: string;
  category: string;
  tags: string[];
  order: number;
  priority: number;
  isActive: boolean;
  isPinned: boolean;
  showOnHomepage: boolean;
  showInFooter: boolean;
  answerFragments: FragmentDraft[];
}

const EMPTY_FAQ: FaqFormValues = {
  question: "",
  slug: "",
  answer: "",
  category: "general",
  tags: [],
  order: 0,
  priority: 0,
  isActive: true,
  isPinned: false,
  showOnHomepage: false,
  showInFooter: false,
  answerFragments: [],
};

const __P = {
  p4: "p-[var(--appkit-space-4)]",
} as const;

const __O = {
  yAuto: "overflow-y-auto",
} as const;

// --- Types -------------------------------------------------------------------

export interface AdminFaqEditorViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  faqId?: string;
  /** Page-region id for this screen (Phase 12) — required because this View is mounted from two different routes (new vs edit), each with its own id. */
  pageId: string;
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
  embedded?: boolean;
}

// --- Constants ---------------------------------------------------------------

/*
 * 🛑 DERIVED FROM THE REAL UNION. NEVER HAND-WRITE THIS LIST AGAIN.
 *
 * Until 2026-10-02 this was six hand-written options — shipping / returns /
 * payments / collector drops / pre-orders / general — and FIVE of them were values no
 * reader in the product understands. `FAQCategory` is orders_payment |
 * shipping_delivery | returns_refunds | product_information | account_security |
 * technical_support | general | scam_awareness, so only `general` overlapped.
 *
 * Measured on production: an FAQ created with "Shipping" stored category
 * "shipping" with isActive true, and then appeared on /faqs under NO sidebar
 * category AND not under All FAQs — nowhere at all. The API types `category` as
 * a bare z.string() and casts it, so the write was a clean 200 and the admin saw
 * a saved FAQ that no visitor could ever reach. Moving it to "Payments" changed
 * nothing.
 *
 * The old list almost certainly came from the OTHER `FAQCategory` declared in
 * `admin/components/sections/adminSectionsTypes.ts` (general | shipping |
 * returns | payment | account | products | sellers) — two same-named types in
 * one package, Root Cause #36. Note it says "payment" where this list said
 * "payments", so it did not even match its own source.
 *
 * `FAQ_CATEGORY_LABELS` is a `Record<FAQCategory, string>`, so adding a ninth
 * category is a compile error here rather than a silently missing option, and a
 * renamed value cannot drift out of this picker.
 */
const CATEGORY_OPTIONS = (
  Object.entries(FAQ_CATEGORY_LABELS) as Array<[FAQCategory, string]>
).map(([value, label]) => ({ value, label }));

function toSlug(str: string): string {
  const base = str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.startsWith("faq-") ? base : `faq-${base}`;
}

// --- Component ---------------------------------------------------------------

export function AdminFaqEditorView({
  faqId,
  pageId,
  pageRegionCards = [],
  onSaved,
  onDeleted,
  embedded,
  ...rest
}: AdminFaqEditorViewProps) {
  const isEdit = Boolean(faqId);

  const [values, setValues] = React.useState<FaqFormValues>(EMPTY_FAQ);
  const [slugManual, setSlugManual] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  const handleChange = React.useCallback((partial: Partial<FaqFormValues>) => {
    setValues((prev) => {
      const next: FaqFormValues = Object.assign({}, prev, partial);
      if (partial.question !== undefined && !slugManual) next.slug = toSlug(String(partial.question));
      return next;
    });
  }, [slugManual]);

  const { showToast } = useToast();

  // --- load existing FAQ (edit mode) ---
  const faqQuery = useQuery({
    queryKey: ["admin", "faqs", faqId],
    queryFn: async () => {
      const res = await apiClient.get(ADMIN_ENDPOINTS.FAQ_BY_ID(faqId!));
      return (res as any)?.data ?? res;
    },
    enabled: isEdit,
  });

  React.useEffect(() => {
    const f = faqQuery.data as any;
    if (!f) return;
    setSlugManual(true);
    setValues({
      question: f.question ?? "",
      slug: f["seo.slug"] ?? f.id ?? "",
      answer: typeof f.answer === "object" ? (f.answer?.text ?? "") : (f.answer ?? ""),
      category: f.category ?? "general",
      tags: Array.isArray(f.tags) ? f.tags : [],
      order: typeof f.order === "number" ? f.order : 0,
      priority: typeof f.priority === "number" ? f.priority : 0,
      isActive: f.isActive ?? true,
      isPinned: f.isPinned ?? false,
      showOnHomepage: f.showOnHomepage ?? false,
      showInFooter: f.showInFooter ?? false,
      answerFragments: Array.isArray(f.answerFragments)
        ? f.answerFragments.map(fromWireFragment)
        : [],
    });
  }, [faqQuery.data]);

  // --- save ---
  const saveMutation = useApiMutation({
    errorMessage: "Failed to save FAQ.",
    mutationFn: async () => {
      const payload: Record<string, JsonValue> = {
        question: values.question,
        slug: values.slug || toSlug(values.question),
        answer: values.answer,
        category: values.category,
        tags: values.tags,
        order: values.order,
        priority: values.priority,
        isActive: values.isActive,
        isPinned: values.isPinned,
        showOnHomepage: values.showOnHomepage,
        showInFooter: values.showInFooter,
        answerFragments: values.answerFragments
          .map(toWireFragment)
          .filter((f): f is WireFragment => f !== null) as unknown as JsonValue,
      };
      if (isEdit) {
        return apiClient.put(ADMIN_ENDPOINTS.FAQ_BY_ID(faqId!), payload);
      }
      return apiClient.post(ADMIN_ENDPOINTS.FAQS, payload);
    },
    onSuccess: (res: JsonValue) => {
      const id = (res as any)?.data?.id ?? (res as any)?.id ?? faqId;
      showToast(isEdit ? "FAQ updated." : "FAQ created.", "success");
      if (onSaved && id) onSaved(id);
    },
  });

  // --- delete ---
  const deleteMutation = useApiMutation({
    errorMessage: "Failed to delete FAQ.",
    mutationFn: () => apiClient.delete(ADMIN_ENDPOINTS.FAQ_BY_ID(faqId!)),
    onSuccess: () => {
      showToast("FAQ deleted.", "success");
      if (onDeleted) onDeleted();
    },
  });
  const isSubmitting = saveMutation.isPending || faqQuery.isLoading;

  const sections = React.useMemo<SectionDef<FaqFormValues>[]>(() => [
    {
      id: "basics",
      label: "Question & answer",
      required: true,
      fields: ["question", "slug", "answer"],
      // The rich-text editor holds an uncommitted buffer.
      keepMounted: true,
      render: ({ values: v, onChange, errors }) => (
        <Stack gap="md">
          <FieldInput
            name="question"
            label="Question"
            value={String(v.question ?? "")}
            onChange={(val) => onChange({ question: val })}
            required
            placeholder={`e.g. How does bidding work on ${getBrandName()}?`}
            error={errors.question}
          />
          <Input
            label="Slug"
            value={String(v.slug ?? "")}
            onChange={(e) => {
              setSlugManual(true);
              onChange({ slug: e.target.value });
            }}
            placeholder="faq-how-does-bidding-work"
            helperText="Auto-generated from the question until you edit it. Must start with 'faq-'."
            error={errors.slug}
          />
          <Stack gap="xs">
            <Text size="sm" weight="medium" color="muted">
              Answer
            </Text>
            <RichTextEditor
              ariaLabel="Answer"
              value={String(v.answer ?? "")}
              onChange={(val) => onChange({ answer: val })}
              placeholder="Write a clear, helpful answer..."
              minHeightClassName="min-h-[200px]"
            />
            {errors.answer && (
              <Text size="xs" color="error" role="alert">{errors.answer}</Text>
            )}
          </Stack>
        </Stack>
      ),
    },
    {
      id: "fragments",
      label: "Conditional phrasing",
      fields: ["answerFragments"],
      render: ({ values: v, onChange }) => {
        const rows = Array.isArray(v.answerFragments) ? v.answerFragments : [];
        return (
          <Stack gap="md">
            <Text size="sm" color="muted">
              Optional. Use this only when the answer MENTIONS something that
              can be switched off site-wide (a listing type, category type,
              or browse page) and omitting that clause would leave an abrupt
              gap — e.g. &ldquo;Reserve upcoming drops via our pre-order
              system&rdquo; needs different wording when pre-orders are off,
              not just silence. Most FAQs need none of these; the rich-text
              answer above already covers ordinary content.
            </Text>
            <Repeater<FragmentDraft>
              rows={rows}
              onChange={(next) => onChange({ answerFragments: next })}
              blank={blankFragment}
              addLabel="Add fragment"
              max={20}
              renderRow={(row, set) => (
                <Stack gap="xs">
                  <Div layout="grid" gap="4" className="grid-cols-2">
                    <Select
                      label="Governed by"
                      options={GOVERNS_KIND_OPTIONS}
                      value={row.governsKind}
                      onValueChange={(val) =>
                        set({
                          governsKind: val as FragmentDraft["governsKind"],
                          governsValue: "",
                        })
                      }
                    />
                    {row.governsKind ? (
                      <Select
                        label="Value"
                        options={governsValueOptions(row.governsKind)}
                        value={row.governsValue}
                        onValueChange={(val) => set({ governsValue: val })}
                      />
                    ) : null}
                  </Div>
                  <Textarea
                    label={row.governsKind ? "Text (shown while enabled)" : "Text (always shown)"}
                    value={row.text}
                    onChange={(e) => set({ text: e.target.value })}
                    maxLength={2000}
                    showCharCount
                    rows={2}
                  />
                  {row.governsKind ? (
                    <Textarea
                      label="Replacement text when disabled (optional — leave blank to omit this clause instead)"
                      value={row.whenHidden}
                      onChange={(e) => set({ whenHidden: e.target.value })}
                      maxLength={2000}
                      showCharCount
                      rows={2}
                    />
                  ) : null}
                </Stack>
              )}
            />
          </Stack>
        );
      },
    },
    {
      id: "classification",
      label: "Filing & ordering",
      fields: ["category", "tags", "order", "priority"],
      render: ({ values: v, onChange, errors }) => (
        <Stack gap="md">
          <Div layout="grid" gap="4" className="grid-cols-2">
            <Select
              label="Category"
              options={CATEGORY_OPTIONS}
              value={String(v.category ?? "general")}
              onValueChange={(val) => onChange({ category: val })}
              error={errors.category}
            />
            <Input
              label="Display order"
              value={String(v.order ?? 0)}
              onChange={(e) => onChange({ order: parseInt(e.target.value, 10) || 0 })}
              type="number"
              min={0}
              helperText="Lower = shown first within category."
              error={errors.order}
            />
          </Div>
          <Input
            label="Priority"
            value={String(v.priority ?? 0)}
            onChange={(e) => onChange({ priority: parseInt(e.target.value, 10) || 0 })}
            type="number"
            min={0}
            helperText="Higher priority FAQs appear first in search results."
            error={errors.priority}
          />
          <TagInput
            label="Tags"
            value={Array.isArray(v.tags) ? (v.tags as string[]) : []}
            onChange={(val) => onChange({ tags: val })}
            placeholder="e.g. shipping, pokemon, returns"
          />
        </Stack>
      ),
    },
    {
      id: "visibility",
      label: "Visibility",
      fields: ["isActive", "isPinned", "showOnHomepage", "showInFooter"],
      render: ({ values: v, onChange }) => (
        <Stack gap="3">
          <Toggle
            label="Active (visible to users)"
            checked={v.isActive ?? true}
            onChange={(c) => onChange({ isActive: c })}
          />
          <Toggle
            label="Pinned (always shown at top)"
            checked={v.isPinned ?? false}
            onChange={(c) => onChange({ isPinned: c })}
          />
          <Toggle
            label="Show on homepage FAQ section"
            checked={v.showOnHomepage ?? false}
            onChange={(c) => onChange({ showOnHomepage: c })}
          />
          <Toggle
            label="Show in footer FAQ links"
            checked={v.showInFooter ?? false}
            onChange={(c) => onChange({ showInFooter: c })}
          />
        </Stack>
      ),
    },
  ], []);

  const nav = useSectionFormNav(sections, values);
  const { shellCtx } = useFormShellState(faqFormSchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });

  const formSection = (
    <>
    <FormShellContext.Provider value={shellCtx}>
      <FormErrorSummary />
      <SectionForm<FaqFormValues>
        sections={sections}
        values={values}
        onChange={handleChange}
        onSubmit={() => saveMutation.mutate()}
        schema={faqFormSchema}
        openIds={nav.openIds}
        onOpenChange={nav.setOpenIds}
        isLoading={isSubmitting}
        submitLabel={isEdit ? "Save changes" : "Create FAQ"}
        destructiveAction={
          isEdit
            ? {
                label: "Delete FAQ",
                onClick: () => setDeleteConfirmOpen(true),
                disabled: deleteMutation.isPending,
              }
            : undefined
        }
      />
    </FormShellContext.Provider>
    {deleteConfirmOpen && (
      <ConfirmDeleteModal
        isOpen
        title="Delete FAQ"
        message="Delete this FAQ? This cannot be undone."
        onConfirm={() => { deleteMutation.mutate(); setDeleteConfirmOpen(false); }}
        onClose={() => setDeleteConfirmOpen(false)}
        isDeleting={deleteMutation.isPending}
      />
    )}
    </>
  );

  if (embedded) {
    return <Div className={`${__O.yAuto} ${__P.p4}`}>{formSection}</Div>;
  }

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={isEdit ? "Edit FAQ" : "New FAQ"}
      sections={[
        <AdminComposableRegion key="page-region" pageId={pageId} initialCards={pageRegionCards} />,
        formSection,
      ]}
    />
  );
}
