import { FormGroup } from "../../../ui";
import { Label, Span, Checkbox, RichTextEditor, Text } from "../../../ui";
import { ImageUpload, MediaImage, useMediaUpload } from "../../media";
import { FormField } from "../../../ui";
import { flattenCategories, type Category } from "../types";
import { normalizeRichTextHtml } from "../../../utils/string.formatter";

export interface CategoryFormLabels {
  name?: string;
  slug?: string;
  description?: string;
  categoryImage?: string;
  imageRecommended?: string;
  parentCategory?: string;
  noneRoot?: string;
  enabled?: string;
  showOnHomepage?: string;
  isBrand?: string;
  order?: string;
}

export interface CategoryFormProps {
  category: Partial<Category>;
  allCategories: Category[];
  onChange: (updated: Partial<Category>) => void;
  isReadonly?: boolean;
  labels?: CategoryFormLabels;
  /** Tailwind class for vertical stack spacing, e.g. "space-y-4" */
  stackClassName?: string;
}

const DEFAULT_LABELS: Required<CategoryFormLabels> = {
  name: "Name",
  slug: "Slug",
  description: "Description",
  categoryImage: "Category Image",
  imageRecommended: "Recommended size: 400×400",
  parentCategory: "Parent Category",
  noneRoot: "— None (root) —",
  enabled: "Enabled",
  showOnHomepage: "Show on homepage",
  isBrand: "Is brand",
  order: "Order",
};

export function CategoryForm({
  category,
  allCategories,
  onChange,
  isReadonly = false,
  labels = {},
  stackClassName = "space-y-4",
}: CategoryFormProps) {
  const { upload } = useMediaUpload();
  const L = { ...DEFAULT_LABELS, ...labels };

  const update = (partial: Partial<Category>) => {
    onChange({ ...category, ...partial });
  };

  const handleNameChange = (value: string) => {
    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    update({ name: value, slug });
  };

  return (
    <div className={stackClassName} data-section="categoryform-div-262">
      <FormGroup columns={2}>
        <FormField
          name="name"
          label={L.name}
          type="text"
          value={category.name || ""}
          onChange={handleNameChange}
          disabled={isReadonly}
        />
        <FormField
          name="slug"
          label={L.slug}
          type="text"
          value={category.slug || ""}
          onChange={(value) => update({ slug: value })}
          disabled={isReadonly}
        />
      </FormGroup>

      <div className="appkit-form-field" data-section="categoryform-div-263">
        <Label className="appkit-form-field__label">{L.description}</Label>
        <RichTextEditor
          value={normalizeRichTextHtml(category.description || "")}
          onChange={(value) => update({ description: value })}
          disabled={isReadonly}
          minHeightClassName="min-h-[140px]"
          placeholder="Enter category description"
        />
        <Text size="sm" variant="secondary" className="appkit-form-field__hint">
          Rich text is supported for category descriptions.
        </Text>
      </div>

      {!isReadonly && (
        <ImageUpload
          currentImage={category.display?.coverImage}
          onUpload={(file) =>
            upload(file, "categories", true, {
              type: "category-image",
              name: category.name || "category",
            })
          }
          onChange={(url) =>
            update({ display: { ...category.display, coverImage: url } })
          }
          label={L.categoryImage}
          helperText={L.imageRecommended}
        />
      )}

      {category.display?.coverImage && isReadonly && (
        <div data-section="categoryform-div-264">
          <Label className="block text-sm font-medium mb-2">
            {L.categoryImage}
          </Label>
          <div className="relative h-32 w-40 overflow-hidden rounded" data-section="categoryform-div-265">
            <MediaImage
              src={category.display.coverImage}
              alt={category.name || ""}
              size="card"
            />
          </div>
        </div>
      )}

      <FormField
        name="parentId"
        label={L.parentCategory}
        type="select"
        value={category.parentId || ""}
        onChange={(value) => update({ parentId: value || null })}
        disabled={isReadonly}
        options={[
          { value: "", label: L.noneRoot },
          ...flattenCategories(allCategories).map((cat) => ({
            value: cat.id,
            label: `${"  ".repeat(cat.tier)}${cat.name}`,
            disabled: cat.id === category.id,
          })),
        ]}
      />

      <FormGroup columns={2}>
        <Checkbox
          checked={category.isActive || false}
          onChange={(e) => update({ isActive: e.target.checked })}
          disabled={isReadonly}
          label={L.enabled}
        />
        <Checkbox
          checked={category.showOnHomepage || false}
          onChange={(e) => update({ showOnHomepage: e.target.checked })}
          disabled={isReadonly}
          label={L.showOnHomepage}
        />
        <Checkbox
          checked={category.isBrand || false}
          onChange={(e) => update({ isBrand: e.target.checked })}
          disabled={isReadonly}
          label={L.isBrand}
        />
      </FormGroup>

      <FormField
        name="order"
        label={L.order}
        type="number"
        value={String(category.order || 0)}
        onChange={(value) => update({ order: parseInt(value) || 0 })}
        disabled={isReadonly}
      />
    </div>
  );
}
