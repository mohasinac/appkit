"use client";

import { useApiMutation } from "@mohasinac/appkit/client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, ConfirmDeleteModal, Div, Heading, Input, RichTextEditor, RichTextRenderer, Row, Select, Span, Stack, StackedViewShell, TagInput, Text, Toggle, useToast } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { ImageUpload, useMediaUpload } from "../../media";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import type { BlogPostCategory, BlogPostStatus } from "../../blog/types";
import { StepDef, StepForm } from "../../shell";

const __P = {
  p4: "p-4",
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
  return base.startsWith("blog-") ? base : `blog-${base}`;
}

function toDateInputValue(val: Date | string | undefined): string {
  if (!val) return "";
  try {
    return new Date(val).toISOString().split("T")[0];
  } catch {
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
  const [currentStep, setCurrentStep] = React.useState(0);
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
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        title: draft.title,
        slug: draft.slug || toSlug(draft.title),
        excerpt: draft.excerpt,
        content: draft.content,
        coverImage: draft.coverImage || undefined,
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
      if (isEdit) {
        return apiClient.patch(ADMIN_ENDPOINTS.BLOG_BY_ID(postId!), payload);
      }
      return apiClient.post(ADMIN_ENDPOINTS.BLOG, {
        ...payload,
        authorId: "admin",
        readTimeMinutes: Math.max(
          1,
          Math.round(
            draft.content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length / 200,
          ),
        ),
        views: 0,
      });
    },
    onSuccess: (res: unknown) => {
      const id = (res as any)?.data?.id ?? (res as any)?.id ?? postId;
      showToast(isEdit ? "Post updated." : "Post created.", "success");
      if (onSaved && id) onSaved(id);
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to save post.", "error");
    },
  });

  // --- delete ---
  const deleteMutation = useApiMutation({
    mutationFn: () => apiClient.delete(ADMIN_ENDPOINTS.BLOG_BY_ID(postId!)),
    onSuccess: () => {
      showToast("Post deleted.", "success");
      if (onDeleted) onDeleted();
    },
    onError: (err: unknown) =>
      showToast((err as Error)?.message ?? "Failed to delete post.", "error"),
  });

  const isLoading = saveMutation.isPending || postQuery.isLoading;

  const steps: StepDef<BlogDraft>[] = [
    {
      label: "Content",
      validate: (values) =>
        !values.title.trim() ? "Title is required" : null,
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
      label: "Media",
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
      label: "SEO & Tags",
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
            <Div className="grid grid-cols-2 gap-4">
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
      label: "Publish",
      render: ({ values, onChange }) => (
        <Stack gap="5">
          <Heading level={3} className="mb-2">Publish Settings</Heading>
          <Div className="grid grid-cols-2 gap-4">
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
            <Div className="pt-4 border-t border-[var(--appkit-color-border)]">
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

  const formContent = (
    <>
      <StepForm<BlogDraft>
        steps={steps}
        values={draft}
        onChange={update}
        onComplete={() => { saveMutation.mutate(); }}
        formId="admin-blog"
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        completeLabel={isEdit ? "Save Changes" : "Create Post"}
        isLoading={isLoading}
      />
      {deleteModal}
    </>
  );

  if (embedded) {
    return <Div className={`${__O.yAuto} ${__P.p4}`}>{formContent}</Div>;
  }

  const previewSection = (
    <div
      key="preview"
      className="rounded-lg border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-raised)] p-5 max-h-[calc(100vh-12rem)] overflow-y-auto"
    >
      <Row className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--appkit-color-text-muted)]" align="center" gap="sm">
        <span>Live preview</span>
      </Row>
      {draft.coverImage ? (
        <img src={draft.coverImage} alt="" className="w-full rounded-md mb-4 object-cover max-h-64" />
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
        <Div className="mt-6 flex flex-wrap gap-1.5">
          {draft.tags.map((t) => (
            <Span
              key={t}
              size="xs"
              className="px-2 py-0.5 rounded-full bg-[var(--appkit-color-surface)] border border-[var(--appkit-color-border)]"
            >
              #{t}
            </Span>
          ))}
        </Div>
      ) : null}
    </div>
  );

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={isEdit ? "Edit Post" : "New Blog Post"}
      sections={[
        <Div key="split" className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-6">
          <Div>{formContent}</Div>
          <Div className="mt-6 lg:mt-0 lg:sticky lg:top-4 lg:self-start">
            {previewSection}
          </Div>
        </Div>,
      ]}
    />
  );
}
