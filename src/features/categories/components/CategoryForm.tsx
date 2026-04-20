import { FormGroup } from "../../../ui";
import { Label, Span, Checkbox } from "../../../ui";
import { ImageUpload, MediaImage, useMediaUpload } from "../../media";
import { FormField } from "../../../ui";
import { flattenCategories, type Category } from "../types";

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
    <div className={stackClassName}>
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

      <FormField
        name="description"
        label={L.description}
        type="textarea"
        rows={3}
        value={category.description || ""}
        onChange={(value) => update({ description: value })}
        disabled={isReadonly}
      />

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
        <div>
          <Label className="block text-sm font-medium mb-2">
            {L.categoryImage}
          </Label>
          <div className="relative h-32 w-40 overflow-hidden rounded">
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
