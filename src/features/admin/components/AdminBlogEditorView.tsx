"use client";
import { normalizeError } from "../../../errors/normalize";

import { useApiMutation, type JsonValue, type FirestoreDocument } from "@mohasinac/appkit/client";
import React, { useEffect, useMemo } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button, ConfirmDeleteModal, Div, Heading, Input, RichTextEditor, RichTextRenderer, Row, Select, Span, Stack, StackedViewShell, TagInput, Text, Toggle, useToast } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { FormShellContext, useFormShellState, applyZodIssues, FormErrorSummary } from "../../../ui/forms";
import { ImageUpload, MediaImage, useMediaUpload } from "../../media";
import { apiClient } from "../../../http";
import type { ApiClientError } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import type { BlogPostCategory, BlogPostStatus } from "../../blog/types";
import { blogDraftSchema } from "../../blog/schemas/blog-form";
import { SectionDef, SectionForm, useSectionFormNav } from "../../shell";



const __P = {
  p4: "p-[var(--appkit-space-4)]",
} as const;

const __O = {
  yAuto: "overflow-y-auto",
} as const;

// --- Types -------------------------------------------------------------------

export interface AdminBlogEditorViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  postId?: string;
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
  embedded?: boolean;
}

interface BlogDraft {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  youtubeId: string;
  category: BlogPostCategory;
  tags: string[];
  status: BlogPostStatus;
  isFeatured: boolean;
  authorName: string;
  publishedAt: string;
  metaTitle: string;
  metaDescription: string;
}

// --- Helpers -----------------------------------------------------------------

const STATUS_OPTIONS = [
  { label: "Draft", value: "draft" as BlogPostStatus },
  { label: "Published", value: "published" as BlogPostStatus },
  { label: "Archived", value: "archived" as BlogPostStatus },
];

const CATEGORY_OPTIONS = [
  { label: "News", value: "news" as BlogPostCategory },
  { label: "Tips", value: "tips" as BlogPostCategory },
  { label: "Guides", value: "guides" as BlogPostCategory },
  { label: "Updates", value: "updates" as BlogPostCategory },
  { label: "Community", value: "community" as BlogPostCategory },
];

const DEFAULT_DRAFT: BlogDraft = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImage: "",
  youtubeId: "",
  category: "news",
  tags: [],
  status: "published",
  isFeatured: true,
  authorName: "Admin",
  publishedAt: "",
  metaTitle: "",
  metaDescription: "",
};

function toSlug(str: string): string {
  const base = str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // Deliberately NOT prefixed with `blog-`. That prefix belongs to the
  // document ID (`generateBlogPostId` adds it); the `slug` FIELD is what
  // `findBySlug` queries and what appears in the public URL, and all 20 stored
  // posts hold it bare. Prefixing here made every newly created post's URL
  // disagree with every existing one.
  return base;
}

function toDateInputValue(val: Date | string | undefined): string {
  if (!val) return "";
  try {
    return new Date(val).toISOString().split("T")[0];
  } catch (_err) {
    void normalizeError(_err);
    return "";
  }
}

// --- Component ---------------------------------------------------------------

export function AdminBlogEditorView({
  postId,
  onSaved,
  onDeleted,
  embedded,
  ...rest
}: AdminBlogEditorViewProps) {
  const isEdit = Boolean(postId);
  const [draft, setDraft] = React.useState<BlogDraft>(DEFAULT_DRAFT);
  const [slugManual, setSlugManual] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const { showToast } = useToast();
  const { upload } = useMediaUpload();

  const update = React.useCallback((partial: Partial<BlogDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  }, []);

  // --- load existing post (edit mode) ---
  const postQuery = useQuery({
    queryKey: ["admin", "blog", postId],
    queryFn: async () => {
      const res = await apiClient.get(ADMIN_ENDPOINTS.BLOG_BY_ID(postId!));
      return (res as any)?.data ?? res;
    },
    enabled: isEdit,
  });

  React.useEffect(() => {
    const p = postQuery.data as any;
    if (!p) return;
    setDraft({
      title: p.title ?? "",
      slug: p.slug ?? "",
      excerpt: p.excerpt ?? "",
      content: p.content ?? "",
      coverImage:
        typeof p.coverImage === "string" ? p.coverImage : p.coverImage?.url ?? "",
      youtubeId: p.youtubeId ?? "",
      category: p.category ?? "news",
      tags: Array.isArray(p.tags) ? p.tags : [],
      status: p.status ?? "published",
      isFeatured: p.isFeatured ?? true,
      authorName: p.authorName ?? "Admin",
      publishedAt: toDateInputValue(p.publishedAt),
      metaTitle: p.metaTitle ?? "",
      metaDescription: p.metaDescription ?? "",
    });
    setSlugManual(true);
  }, [postQuery.data]);

  // --- save ---
  const saveMutation = useApiMutation({
    errorMessage: "Failed to save post.",
    mutationFn: async () => {
      const payload: FirestoreDocument = {
        title: draft.title,
        slug: draft.slug || toSlug(draft.title),
        excerpt: draft.excerpt,
        content: draft.content,
        coverImage: draft.coverImage ? { type: "image", url: draft.coverImage } : undefined,
        youtubeId: draft.youtubeId || undefined,
        category: draft.category,
        tags: draft.tags,
        status: draft.status,
        isFeatured: draft.isFeatured,
        authorName: draft.authorName,
        publishedAt:
          draft.status === "published" && !draft.publishedAt
            ? new Date().toISOString()
            : draft.publishedAt
              ? new Date(draft.publishedAt).toISOString()
              : undefined,
        metaTitle: draft.metaTitle || undefined,
        metaDescription: draft.metaDescription || undefined,
      };
      // T1 calculated field. It used to be computed ONLY on create, so editing
      // a post's body left its "N min read" frozen at whatever the first draft
      // happened to be — Root Cause #39, a CREATE transform with no UPDATE
      // counterpart. Computed once here and sent on both paths.
      const readTimeMinutes = Math.max(
        1,
        Math.round(
          draft.content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length / 200,
        ),
      );
      if (isEdit) {
        return apiClient.patch(ADMIN_ENDPOINTS.BLOG_BY_ID(postId!), {
          ...payload,
          readTimeMinutes,
        });
      }
      return apiClient.post(ADMIN_ENDPOINTS.BLOG, {
        ...payload,
        authorId: "admin",
        readTimeMinutes,
        views: 0,
      });
    },
    onSuccess: (res: JsonValue) => {
      const id = (res as any)?.data?.id ?? (res as any)?.id ?? postId;
      showToast(isEdit ? "Post updated." : "Post created.", "success");
      if (onSaved && id) onSaved(id);
    },
    onError: (err: Error) => {
      const issues = (err as ApiClientError)?.issues;
      if (issues && issues.length > 0) {
        applyZodIssues(
          issues as { path: (string | number)[]; message: string }[],
          setFieldError,
        );
      }
      
    },
  });

  // --- delete ---
  const deleteMutation = useApiMutation({
    errorMessage: "Failed to delete post.",
    mutationFn: () => apiClient.delete(ADMIN_ENDPOINTS.BLOG_BY_ID(postId!)),
    onSuccess: () => {
      showToast("Post deleted.", "success");
      if (onDeleted) onDeleted();
    },
  });

  const isLoading = saveMutation.isPending || postQuery.isLoading;

  /**
   * Sections, not steps. Every field is reachable at once and one submit at
   * the bottom saves the lot — the old wizard blocked step 2 until step 1
   * validated, so a typo in the title made the whole post uneditable.
   *
   * The `render` bodies are unchanged: this form's controls are genuinely
   * bespoke (a slug that auto-follows the title until touched, a read-time
   * estimate, a live preview). What is no longer hand-written is which field
   * belongs where — that is read off the schema's annotations, and the ids
   * below match them exactly so `<FormErrorSummary>` can jump to the right
   * section.
   *
   * The per-step `validate` callbacks are gone: they duplicated rules the Zod
   * schema already states, and only ran as a gate to the NEXT step, which no
   * longer exists.
   */
  const sections: SectionDef<BlogDraft>[] = [
    {
      id: "content",
      label: "Content",
      required: true,
      quick: true,
      fields: ["title", "slug", "excerpt", "content"],
      render: ({ values, onChange }) => (
        <Stack gap="5">
          <Heading level={3} className="mb-2">Content</Heading>
          <Input
            label="Title"
            value={values.title}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ title: v, ...(!slugManual && { slug: toSlug(v) }) });
            }}
            placeholder="e.g. How to Grade Pokémon Cards"
          />
          <Input
            label="Slug"
            value={values.slug}
            onChange={(e) => {
              setSlugManual(true);
              onChange({ slug: e.target.value });
            }}
            placeholder="blog-how-to-grade-pokemon-cards"
            helperText="Auto-generated from title. Must start with 'blog-'."
          />
          <Input
            label="Excerpt"
            value={values.excerpt}
            onChange={(e) => onChange({ excerpt: e.target.value })}
            placeholder="Short summary shown in listings and cards"
          />
          <Stack gap="xs">
            <Text size="sm" weight="medium" color="muted">
              Content
            </Text>
            <RichTextEditor
              value={values.content}
              onChange={(v) => onChange({ content: v })}
              placeholder="Write your article here..."
              minHeightClassName="min-h-[320px]"
            />
          </Stack>
        </Stack>
      ),
    },
    {
      id: "media",
      label: "Media",
      // Media sections MUST stay mounted while collapsed: <Collapse> unmounts
      // its children, which would abort an in-flight upload.
      keepMounted: true,
      fields: ["coverImage", "youtubeId"],
      render: ({ values, onChange }) => (
        <Stack gap="5">
          <Heading level={3} className="mb-2">Media</Heading>
          <ImageUpload
            label="Cover Image"
            currentImage={values.coverImage}
            onUpload={(file) =>
              upload(file, "blog", true, {
                type: "blog-cover",
                title: values.title || values.slug,
                category: values.category,
              })
            }
            onChange={(url) => onChange({ coverImage: url })}
          />
          <Input
            label="YouTube Video ID (optional)"
            value={values.youtubeId}
            onChange={(e) => onChange({ youtubeId: e.target.value })}
            placeholder="e.g. dQw4w9WgXcQ"
            helperText="The 11-character video ID from the YouTube URL."
          />
        </Stack>
      ),
    },
    {
      id: "seo",
      label: "SEO & Tags",
      quick: true,
      fields: ["category", "tags", "metaTitle", "metaDescription"],
      render: ({ values, onChange }) => {
        const readTime = Math.max(
          1,
          Math.round(
            values.content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length / 200,
          ),
        );
        return (
          <Stack gap="5">
            <Heading level={3} className="mb-2">SEO &amp; Tags</Heading>
            <Div layout="grid" gap="4" className="grid-cols-2">
              <Select
                label="Category"
                options={CATEGORY_OPTIONS}
                value={values.category}
                onValueChange={(v) => onChange({ category: v as BlogPostCategory })}
              />
              <Div>
                <Text className="mb-1.5" size="sm" weight="medium">Estimated Read Time</Text>
                <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
                  ~{readTime} min (auto-calculated from content)
                </Text>
              </Div>
            </Div>
            <TagInput
              label="Tags"
              value={values.tags}
              onChange={(t) => onChange({ tags: t })}
              placeholder="e.g. pokemon, grading, tcg"
            />
            <Input
              label="Meta Title (optional)"
              value={values.metaTitle}
              onChange={(e) => onChange({ metaTitle: e.target.value })}
              placeholder="Defaults to post title"
            />
            <Input
              label="Meta Description (optional)"
              value={values.metaDescription}
              onChange={(e) => onChange({ metaDescription: e.target.value })}
              placeholder="SEO description — max 160 chars"
              maxLength={160}
            />
          </Stack>
        );
      },
    },
    {
      id: "publish",
      label: "Publish",
      quick: true,
      fields: ["status", "publishedAt", "authorName", "isFeatured"],
      render: ({ values, onChange }) => (
        <Stack gap="5">
          <Heading level={3} className="mb-2">Publish Settings</Heading>
          <Div layout="grid" gap="4" className="grid-cols-2">
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              value={values.status}
              onValueChange={(v) => onChange({ status: v as BlogPostStatus })}
            />
            <Input
              label="Publish date (optional)"
              value={values.publishedAt}
              onChange={(e) => onChange({ publishedAt: e.target.value })}
              type="date"
              helperText="Auto-set to now when publishing."
            />
          </Div>
          <Input
            label="Author Name"
            value={values.authorName}
            onChange={(e) => onChange({ authorName: e.target.value })}
            placeholder="Author display name"
          />
          <Toggle
            label="Featured post"
            checked={values.isFeatured}
            onChange={(checked) => onChange({ isFeatured: checked })}
          />
          {isEdit && (
            <Div className="border-t border-[var(--appkit-color-border)]" padding="t-md">
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                isLoading={deleteMutation.isPending}
              >
                Delete post
              </Button>
            </Div>
          )}
        </Stack>
      ),
    },
  ];

  const deleteModal = (
    <ConfirmDeleteModal
      isOpen={showDeleteConfirm}
      onConfirm={() => {
        setShowDeleteConfirm(false);
        deleteMutation.mutate();
      }}
      onClose={() => setShowDeleteConfirm(false)}
      title="Delete post"
      message="This will permanently delete the blog post. This cannot be undone."
    />
  );

  // Replaces the hand-rolled fieldToStepIndex + goToStep pair. The hook owns
  // expand-then-scroll ordering, which a raw setState could not: a collapsed
  // panel has to MOUNT before scrollIntoView/focus can reach the field. That
  // jump was dead before W0 — `steps: []` was hardcoded in both context paths,
  // so FormErrorSummary's label resolved to undefined for every form.
  const { openIds, setOpenIds, goToSection, fieldToSectionIndex, sectionMeta } =
    useSectionFormNav(sections, draft);

  const { shellCtx, setFieldError, validate } = useFormShellState(blogDraftSchema, {
    sections: sectionMeta,
    onGoToSection: goToSection,
    fieldToSectionIndex,
  });

  // Live validation. Must sit AFTER useFormShellState — it used to run above
  // the hook, which only compiled because the wizard declared the hook higher
  // up the component.
  useEffect(() => {
    validate(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, validate]);

  const formContent = (
    <FormShellContext.Provider value={shellCtx}>
      <FormErrorSummary />
      <SectionForm<BlogDraft>
        sections={sections}
        values={draft}
        onChange={update}
        onSubmit={() => { saveMutation.mutate(); }}
        schema={blogDraftSchema}
        openIds={openIds}
        onOpenChange={setOpenIds}
        submitLabel={isEdit ? "Save Changes" : "Create Post"}
        isLoading={isLoading}
      />
      {deleteModal}
    </FormShellContext.Provider>
  );

  if (embedded) {
    return <Div className={`${__O.yAuto} ${__P.p4}`}>{formContent}</Div>;
  }

  const previewSection = (
    <Div
      key="preview"
      rounded="lg"
      padding="5"
      className="border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-raised)] max-h-[calc(100vh-12rem)] overflow-y-auto"
    >
      <Row textSize="xs" textWeight="semibold" color="muted" className="mb-3 uppercase tracking-wide" align="center" gap="sm">
        <Span>Live preview</Span>
      </Row>
      {draft.coverImage ? (
        <Div className="relative h-64 w-full mb-4" rounded="md" overflow="hidden">
          <MediaImage src={draft.coverImage} alt="" size="hero" />
        </Div>
      ) : null}
      <Heading level={1} className="mb-1" size="2xl" weight="bold">
        {draft.title || "Untitled post"}
      </Heading>
      <Text className="text-[var(--appkit-color-text-muted)] mb-4" size="xs">
        {draft.authorName || "Anonymous"}
        {draft.category ? ` · ${draft.category}` : ""}
      </Text>
      {draft.excerpt ? (
        <Text className="italic text-[var(--appkit-color-text-secondary)] mb-4">
          {draft.excerpt}
        </Text>
      ) : null}
      <RichTextRenderer html={draft.content || "<em>No content yet…</em>"} />
      {draft.tags.length > 0 ? (
        <Row wrap gap="xs" className="mt-6">
          {draft.tags.map((t) => (
            <Span
              key={t}
              size="xs"
              className="bg-[var(--appkit-color-surface)] border border-[var(--appkit-color-border)]" rounded="full" padding="pill-xs"
            >
              #{t}
            </Span>
          ))}
        </Row>
      ) : null}
    </Div>
  );

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={isEdit ? "Edit Post" : "New Blog Post"}
      sections={[
        <Div key="split" className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-[1.5rem]">
          <Div>{formContent}</Div>
          <Div className="mt-6 lg:mt-0 lg:sticky lg:top-4 lg:self-start">
            {previewSection}
          </Div>
        </Div>,
      ]}
    />
  );
}
