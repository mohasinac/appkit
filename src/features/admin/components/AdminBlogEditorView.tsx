"use client";

import React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Form, Input, RichTextEditor, Select, StackedViewShell, TagInput, Text, Toggle, useToast } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { ImageUpload } from "../../media/upload/ImageUpload";
import { useMediaUpload } from "../../media";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import type { BlogPostCategory, BlogPostStatus } from "../../blog/types";

// --- Types -------------------------------------------------------------------

export interface AdminBlogEditorViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  postId?: string;
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
  embedded?: boolean;
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

  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugManual, setSlugManual] = React.useState(false);
  const [excerpt, setExcerpt] = React.useState("");
  const [content, setContent] = React.useState("");
  const [coverImage, setCoverImage] = React.useState("");
  const [category, setCategory] = React.useState<BlogPostCategory>("news");
  const [tags, setTags] = React.useState<string[]>([]);
  const [status, setStatus] = React.useState<BlogPostStatus>("draft");
  const [isFeatured, setIsFeatured] = React.useState(false);
  const [authorName, setAuthorName] = React.useState("Admin");
  const [publishedAt, setPublishedAt] = React.useState("");
  const [metaTitle, setMetaTitle] = React.useState("");
  const [metaDescription, setMetaDescription] = React.useState("");

  const { showToast } = useToast();
  const { upload } = useMediaUpload();

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
    setTitle(p.title ?? "");
    setSlug(p.slug ?? "");
    setSlugManual(true);
    setExcerpt(p.excerpt ?? "");
    setContent(p.content ?? "");
    setCoverImage(
      typeof p.coverImage === "string"
        ? p.coverImage
        : p.coverImage?.url ?? "",
    );
    setCategory(p.category ?? "news");
    setTags(Array.isArray(p.tags) ? p.tags : []);
    setStatus(p.status ?? "draft");
    setIsFeatured(p.isFeatured ?? false);
    setAuthorName(p.authorName ?? "Admin");
    setPublishedAt(toDateInputValue(p.publishedAt));
    setMetaTitle(p.metaTitle ?? "");
    setMetaDescription(p.metaDescription ?? "");
  }, [postQuery.data]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugManual) setSlug(toSlug(value));
  };

  // --- save ---
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        title,
        slug: slug || toSlug(title),
        excerpt,
        content,
        coverImage: coverImage || undefined,
        category,
        tags,
        status,
        isFeatured,
        authorName,
        publishedAt:
          status === "published" && !publishedAt
            ? new Date().toISOString()
            : publishedAt
              ? new Date(publishedAt).toISOString()
              : undefined,
        metaTitle: metaTitle || undefined,
        metaDescription: metaDescription || undefined,
      };
      if (isEdit) {
        return apiClient.patch(ADMIN_ENDPOINTS.BLOG_BY_ID(postId!), payload);
      }
      return apiClient.post(ADMIN_ENDPOINTS.BLOG, {
        ...payload,
        authorId: "admin",
        readTimeMinutes: Math.max(
          1,
          Math.round(content.replace(/<[^>]*>/g, "").split(/\s+/).length / 200),
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
  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(ADMIN_ENDPOINTS.BLOG_BY_ID(postId!)),
    onSuccess: () => {
      showToast("Post deleted.", "success");
      if (onDeleted) onDeleted();
    },
    onError: (err: unknown) =>
      showToast((err as Error)?.message ?? "Failed to delete post.", "error"),
  });

  const isSubmitting = saveMutation.isPending || postQuery.isLoading;
  const canSave = Boolean(title);

  const formSection = (
    <Form
      key="blog-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-5"
        >
          {/* Core fields */}
          <Input
            label="Title"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
            placeholder="e.g. How to Grade Pokémon Cards"
          />

          <Input
            label="Slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugManual(true);
            }}
            placeholder="blog-how-to-grade-pokemon-cards"
            helperText="Auto-generated from title. Must start with 'blog-'."
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              options={CATEGORY_OPTIONS}
              value={category}
              onValueChange={(v) => setCategory(v as BlogPostCategory)}
            />
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              value={status}
              onValueChange={(v) => setStatus(v as BlogPostStatus)}
            />
          </div>

          <Input
            label="Excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Short summary shown in listings and cards"
          />

          {/* Cover image */}
          <ImageUpload
            label="Cover image"
            currentImage={coverImage}
            onUpload={(file) => upload(file, "blog", true, { type: "blog-cover", title: title || slug, category })}
            onChange={setCoverImage}
          />

          {/* Rich text content */}
          <div className="space-y-1">
            <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Content
            </Text>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Write your article here..."
              minHeightClassName="min-h-[320px]"
            />
          </div>

          {/* Tags */}
          <TagInput
            label="Tags"
            value={tags}
            onChange={setTags}
            placeholder="e.g. pokemon, grading, tcg"
          />

          {/* Author + publish date */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Author name"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Author display name"
            />
            <Input
              label="Publish date (optional)"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              type="date"
              helperText="Auto-set to now when publishing."
            />
          </div>

          <Toggle
            label="Featured post"
            checked={isFeatured}
            onChange={setIsFeatured}
          />

          {/* SEO */}
          <Input
            label="Meta title (optional)"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            placeholder="Defaults to post title"
          />
          <Input
            label="Meta description (optional)"
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            placeholder="SEO description — max 160 chars"
            maxLength={160}
          />

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={!canSave || isSubmitting}
            >
              {isEdit ? "Save changes" : "Create post"}
            </Button>
            {isEdit && (
              <Button
                type="button"
                variant="danger"
                isLoading={deleteMutation.isPending}
                onClick={() => {
                  if (confirm("Delete this post? This cannot be undone.")) {
                    deleteMutation.mutate();
                  }
                }}
              >
                Delete post
              </Button>
            )}
          </div>
    </Form>
  );

  if (embedded) {
    return <div className="overflow-y-auto p-4">{formSection}</div>;
  }

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={isEdit ? "Edit Post" : "New Blog Post"}
      sections={[formSection]}
    />
  );
}
