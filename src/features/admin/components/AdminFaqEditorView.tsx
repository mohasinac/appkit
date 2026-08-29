"use client";

import type { JsonValue } from "@mohasinac/appkit/client";
import { useApiMutation } from "@mohasinac/appkit/client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ConfirmDeleteModal, Div, Input, RichTextEditor, Select, Stack, StackedViewShell, TagInput, Text, Toggle, useToast } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { FieldInput, FormErrorSummary, FormShellContext, useFormShellState } from "../../../ui/forms";
import { SectionForm, useSectionFormNav, type SectionDef } from "../../shell";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

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
});

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
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
  embedded?: boolean;
}

// --- Constants ---------------------------------------------------------------

const CATEGORY_OPTIONS = [
  { label: "Shipping", value: "shipping" },
  { label: "Returns", value: "returns" },
  { label: "Payments", value: "payments" },
  { label: "Auctions", value: "auctions" },
  { label: "Pre-orders", value: "pre-orders" },
  { label: "General", value: "general" },
];

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
            placeholder="e.g. How does bidding work on LetItRip?"
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
      sections={[formSection]}
    />
  );
}
