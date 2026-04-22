import React from "react";
import {
  Div,
  Input,
  Label,
  RichTextEditor,
  Select,
  Stack,
  TagInput,
  Text,
  Textarea,
} from "../../../ui";
import { Checkbox } from "../../forms/index";
import { MediaUploadField, MediaUploadList } from "../../media/index";
import {
  coerceMediaFieldArray,
  getMediaUrl,
  type MediaField,
  type MediaFieldInput,
} from "../../media/types/index";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";

export interface BlogPostFormValue {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  coverImage?: MediaFieldInput;
  contentImages?: MediaField[];
  additionalImages?: MediaField[];
  category?: string;
  tags?: string[];
  isFeatured?: boolean;
  status?: string;
  readTimeMinutes?: number;
}

export interface BlogPostFormOption {
  value: string;
  label: string;
}

export interface BlogPostFormLabels {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  coverImageHelper?: string;
  contentImages: string;
  contentImagesHelper?: string;
  additionalImages: string;
  additionalImagesHelper?: string;
  category: string;
  status: string;
  tags: string;
  readTime: string;
  featured: string;
}

export interface BlogPostFormProps {
  value: BlogPostFormValue;
  onChange: (next: BlogPostFormValue) => void;
  categoryOptions: BlogPostFormOption[];
  statusOptions: BlogPostFormOption[];
  labels: BlogPostFormLabels;
  onUploadCover: (file: File) => Promise<string>;
  onUploadContentImage: (file: File) => Promise<string>;
  onUploadAdditionalImage: (file: File) => Promise<string>;
  onAbort?: (stagedUrls: string[]) => void;
  isReadonly?: boolean;
  renderContentField?: (args: {
    value: string;
    onChange: (value: string) => void;
    isReadonly: boolean;
  }) => React.ReactNode;
  renderContentReadonly?: (value: string) => React.ReactNode;
}

export function BlogPostForm({
  value,
  onChange,
  categoryOptions,
  statusOptions,
  labels,
  onUploadCover,
  onUploadContentImage,
  onUploadAdditionalImage,
  onAbort,
  isReadonly = false,
  renderContentField,
  renderContentReadonly,
}: BlogPostFormProps) {
  const coverImageUrl = getMediaUrl(value.coverImage);
  const contentImages = coerceMediaFieldArray(value.contentImages);
  const additionalImages = coerceMediaFieldArray(value.additionalImages);

  const update = (partial: Partial<BlogPostFormValue>) => {
    onChange({
      ...value,
      ...partial,
    });
  };

  return (
    <Stack gap="5">
      <Div className="grid gap-4 md:grid-cols-2">
        <Stack gap="xs">
          <Label htmlFor="blog-post-title">{labels.title}</Label>
          <Input
            id="blog-post-title"
            value={value.title || ""}
            onChange={(event) => update({ title: event.target.value })}
            disabled={isReadonly}
          />
        </Stack>

        <Stack gap="xs">
          <Label htmlFor="blog-post-slug">{labels.slug}</Label>
          <Input
            id="blog-post-slug"
            value={value.slug || ""}
            onChange={(event) => update({ slug: event.target.value })}
            disabled={isReadonly}
          />
        </Stack>
      </Div>

      <Stack gap="xs">
        <Label htmlFor="blog-post-excerpt">{labels.excerpt}</Label>
        <Textarea
          id="blog-post-excerpt"
          value={value.excerpt || ""}
          onChange={(event) => update({ excerpt: event.target.value })}
          rows={3}
          disabled={isReadonly}
        />
      </Stack>

      <Stack gap="xs">
        <Label>{labels.content}</Label>
        {renderContentField ? (
          renderContentField({
            value: value.content || "",
            onChange: (content) => update({ content }),
            isReadonly,
          })
        ) : isReadonly && renderContentReadonly ? (
          renderContentReadonly(value.content || "")
        ) : (
          <Stack gap="xs">
            <RichTextEditor
              value={normalizeRichTextHtml(value.content || "")}
              onChange={(content) => update({ content })}
              disabled={isReadonly}
              minHeightClassName="min-h-[240px]"
              placeholder="Write blog content"
            />
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">
              Rich text is supported for blog content.
            </Text>
          </Stack>
        )}
      </Stack>

      <MediaUploadField
        label={labels.coverImage}
        value={coverImageUrl || ""}
        onChange={(url) =>
          update({ coverImage: url ? { url, type: "image" } : null })
        }
        onChangeField={(media) => update({ coverImage: media })}
        onUpload={onUploadCover}
        onAbort={onAbort}
        accept="image/*"
        maxSizeMB={10}
        disabled={isReadonly}
        helperText={labels.coverImageHelper}
      />

      <MediaUploadList
        label={labels.contentImages}
        value={contentImages}
        onChange={(media) => update({ contentImages: media })}
        onUpload={onUploadContentImage}
        onAbort={onAbort}
        accept="image/*"
        maxItems={10}
        maxSizeMB={10}
        disabled={isReadonly}
        helperText={labels.contentImagesHelper}
      />

      <MediaUploadList
        label={labels.additionalImages}
        value={additionalImages}
        onChange={(media) => update({ additionalImages: media })}
        onUpload={onUploadAdditionalImage}
        onAbort={onAbort}
        accept="image/*"
        maxItems={5}
        maxSizeMB={10}
        disabled={isReadonly}
        helperText={labels.additionalImagesHelper}
      />

      <Div className="grid gap-4 md:grid-cols-2">
        <Select
          label={labels.category}
          value={value.category}
          onValueChange={(category) => update({ category })}
          options={categoryOptions}
          disabled={isReadonly}
        />
        <Select
          label={labels.status}
          value={value.status}
          onValueChange={(status) => update({ status })}
          options={statusOptions}
          disabled={isReadonly}
        />
      </Div>

      <Div className="grid gap-4 md:grid-cols-2">
        <TagInput
          label={labels.tags}
          value={value.tags ?? []}
          onChange={(tags) => update({ tags })}
          disabled={isReadonly}
        />
        <Stack gap="xs">
          <Label htmlFor="blog-post-read-time">{labels.readTime}</Label>
          <Input
            id="blog-post-read-time"
            type="number"
            value={String(value.readTimeMinutes ?? 5)}
            onChange={(event) =>
              update({
                readTimeMinutes: parseInt(event.target.value, 10) || 5,
              })
            }
            disabled={isReadonly}
          />
        </Stack>
      </Div>

      <Checkbox
        label={labels.featured}
        checked={value.isFeatured || false}
        onChange={(event) => update({ isFeatured: event.target.checked })}
        disabled={isReadonly}
      />

      {isReadonly && coverImageUrl && (
        <Text size="xs" variant="secondary">
          {coverImageUrl}
        </Text>
      )}
    </Stack>
  );
}
