"use client";

import React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Button,
  Form,
  Input,
  RichTextEditor,
  Select,
  StackedViewShell,
  TagInput,
  Toggle,
  useToast,
} from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

// --- Types -------------------------------------------------------------------

export interface AdminFaqEditorViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  faqId?: string;
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
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
  ...rest
}: AdminFaqEditorViewProps) {
  const isEdit = Boolean(faqId);

  const [question, setQuestion] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugManual, setSlugManual] = React.useState(false);
  const [answer, setAnswer] = React.useState("");
  const [category, setCategory] = React.useState("general");
  const [tags, setTags] = React.useState<string[]>([]);
  const [order, setOrder] = React.useState(0);
  const [priority, setPriority] = React.useState(0);
  const [isActive, setIsActive] = React.useState(true);
  const [isPinned, setIsPinned] = React.useState(false);
  const [showOnHomepage, setShowOnHomepage] = React.useState(false);
  const [showInFooter, setShowInFooter] = React.useState(false);

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
    setQuestion(f.question ?? "");
    setSlug(f["seo.slug"] ?? f.id ?? "");
    setSlugManual(true);
    setAnswer(typeof f.answer === "object" ? (f.answer?.text ?? "") : (f.answer ?? ""));
    setCategory(f.category ?? "general");
    setTags(Array.isArray(f.tags) ? f.tags : []);
    setOrder(typeof f.order === "number" ? f.order : 0);
    setPriority(typeof f.priority === "number" ? f.priority : 0);
    setIsActive(f.isActive ?? true);
    setIsPinned(f.isPinned ?? false);
    setShowOnHomepage(f.showOnHomepage ?? false);
    setShowInFooter(f.showInFooter ?? false);
  }, [faqQuery.data]);

  const handleQuestionChange = (value: string) => {
    setQuestion(value);
    if (!slugManual) setSlug(toSlug(value));
  };

  // --- save ---
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        question,
        slug: slug || toSlug(question),
        answer,
        category,
        tags,
        order,
        priority,
        isActive,
        isPinned,
        showOnHomepage,
        showInFooter,
      };
      if (isEdit) {
        return apiClient.put(ADMIN_ENDPOINTS.FAQ_BY_ID(faqId!), payload);
      }
      return apiClient.post(ADMIN_ENDPOINTS.FAQS, payload);
    },
    onSuccess: (res: unknown) => {
      const id = (res as any)?.data?.id ?? (res as any)?.id ?? faqId;
      showToast(isEdit ? "FAQ updated." : "FAQ created.", "success");
      if (onSaved && id) onSaved(id);
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to save FAQ.", "error");
    },
  });

  // --- delete ---
  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(ADMIN_ENDPOINTS.FAQ_BY_ID(faqId!)),
    onSuccess: () => {
      showToast("FAQ deleted.", "success");
      if (onDeleted) onDeleted();
    },
    onError: (err: unknown) =>
      showToast((err as Error)?.message ?? "Failed to delete FAQ.", "error"),
  });

  const isSubmitting = saveMutation.isPending || faqQuery.isLoading;
  const canSave = Boolean(question.trim()) && Boolean(answer.trim());

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={isEdit ? "Edit FAQ" : "New FAQ"}
      sections={[
        <Form
          key="faq-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-5"
        >
          <Input
            label="Question"
            value={question}
            onChange={(e) => handleQuestionChange(e.target.value)}
            required
            placeholder="e.g. How does bidding work on LetItRip?"
          />

          <Input
            label="Slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugManual(true);
            }}
            placeholder="faq-how-does-bidding-work"
            helperText="Auto-generated from question. Must start with 'faq-'."
          />

          <div className="space-y-1">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Answer
            </p>
            <RichTextEditor
              value={answer}
              onChange={setAnswer}
              placeholder="Write a clear, helpful answer..."
              minHeightClassName="min-h-[200px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              options={CATEGORY_OPTIONS}
              value={category}
              onValueChange={setCategory}
            />
            <Input
              label="Display order"
              value={String(order)}
              onChange={(e) => setOrder(parseInt(e.target.value, 10) || 0)}
              type="number"
              min={0}
              helperText="Lower = shown first within category."
            />
          </div>

          <Input
            label="Priority"
            value={String(priority)}
            onChange={(e) => setPriority(parseInt(e.target.value, 10) || 0)}
            type="number"
            min={0}
            helperText="Higher priority FAQs appear first in search results."
          />

          <TagInput
            label="Tags"
            value={tags}
            onChange={setTags}
            placeholder="e.g. shipping, pokemon, returns"
          />

          <div className="space-y-3 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Visibility</p>
            <Toggle label="Active (visible to users)" checked={isActive} onChange={setIsActive} />
            <Toggle label="Pinned (always shown at top)" checked={isPinned} onChange={setIsPinned} />
            <Toggle label="Show on homepage FAQ section" checked={showOnHomepage} onChange={setShowOnHomepage} />
            <Toggle label="Show in footer FAQ links" checked={showInFooter} onChange={setShowInFooter} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={!canSave || isSubmitting}
            >
              {isEdit ? "Save changes" : "Create FAQ"}
            </Button>
            {isEdit && (
              <Button
                type="button"
                variant="danger"
                isLoading={deleteMutation.isPending}
                onClick={() => {
                  if (confirm("Delete this FAQ? This cannot be undone.")) {
                    deleteMutation.mutate();
                  }
                }}
              >
                Delete FAQ
              </Button>
            )}
          </div>
        </Form>,
      ]}
    />
  );
}
