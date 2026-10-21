"use client";

import { useApiMutation, type JsonValue } from "@mohasinac/appkit/client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button, Card, CardBody, ConfirmDeleteModal, Div, Input, PaginatedSelect, Select, Span, Stack, StackedViewShell, Text, Textarea, Toggle, useToast, Show, StickyToolbar } from "../../../ui";
import { usedPlaceholders } from "../../../_internal/shared/templating/placeholders";
import type { CategoryProductDefaults, CategoryPriceGuidance } from "../../categories/schemas/category-content";
import type { StackedViewShellProps } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { CategoryQuickCreateForm } from "./CategoryQuickCreateForm";
import { useMediaUpload } from "../../media";
import { ImageUpload } from "../../media/upload/ImageUpload";
import { Repeater } from "../../../ui/components/Repeater";
import { FieldInput, FormErrorSummary, FormShellContext, useFormShellState } from "../../../ui/forms";
import { SectionForm, useSectionFormNav, type SectionDef } from "../../shell";

/*
 * ── Content & Templates (C2c) ────────────────────────────────────────────────
 *
 * 🛑 `highlights` and `faqs` have had NO editor since they shipped, and B3
 * added `contentBody`, `descriptionTemplates` and `productDefaults` with none
 * either. All five are in `CATEGORIES_UPDATABLE_FIELDS`, so the repository has
 * always been willing — the only thing missing was somewhere to type them.
 *
 * ## Why string arrays are newline-separated textareas
 *
 * `highlights`, `inTheBox` and `seoKeywords` are flat `string[]`. A drag-handle
 * repeater for each would be three widgets to build and three to maintain, and
 * an admin pasting six bullets from a competitor's page wants to paste six
 * lines. The textarea IS the better tool here, not a shortcut — order is
 * preserved, reordering is a cut-and-paste, and a blank line is dropped rather
 * than stored as an empty bullet.
 *
 * Repeaters are reserved for the shapes that genuinely need per-row fields:
 * FAQs (question + answer), specifications (name + value + unit) and templates
 * (label + variant + body).
 */
const linesToList = (raw: string): string[] =>
  raw
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
const listToLines = (list: readonly string[] | undefined): string =>
  (list ?? []).join("\n");

const TEMPLATE_VARIANT_OPTIONS = [
  { value: "default", label: "Default — any condition" },
  { value: "new_in_box", label: "New in box" },
  { value: "new_in_packet", label: "New in packet" },
  { value: "pre_owned", label: "Pre-owned / used" },
  { value: "replica", label: "Reproduction" },
];

const AUTHENTICITY_OPTIONS = [
  { value: "", label: "Not set — the seller chooses" },
  { value: "original", label: "Original" },
  { value: "reproduction", label: "Reproduction (midfake)" },
  { value: "unverified", label: "Unverified" },
];

const CONDITION_DEFAULT_OPTIONS = [
  { value: "", label: "Not set — the seller chooses" },
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "used", label: "Used" },
  { value: "refurbished", label: "Refurbished" },
];

interface CategoryFaq {
  question: string;
  answer: string;
}
interface CategorySpecRow {
  name: string;
  value: string;
  unit?: string;
}
interface CategoryTemplateRow {
  id: string;
  label: string;
  variant: string;
  body: string;
}

async function loadTaxCodeOptions(query: string, page: number) {
  const params = new URLSearchParams({ page: String(page), pageSize: "25" });
  if (query) params.set("q", query);
  const res = await apiClient.get(`${ADMIN_ENDPOINTS.TAX_CODES}?${params.toString()}`);
   
  const payload = (res as any)?.data ?? res;
  const items: { id: string; label?: string; hsnCode?: string; gstRate?: number }[] =
    payload?.items ?? payload?.data ?? [];
  return {
    items: items.map((t) => ({
      value: t.id,
      label: t.label ?? `${t.hsnCode ?? t.id} — ${t.gstRate ?? "?"}%`,
    })),
    hasMore: payload?.hasMore ?? false,
  };
}

/**
 * Covers every field the form actually edits.
 *
 * It previously declared four of seven and carried `.passthrough()`, so
 * `description`, `order` and `showInMenu` were unvalidated — and `order` is
 * typed by hand into a text input and sent through `Number()`.
 */
const categoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required").max(120),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, digits and hyphens only")
    .optional()
    .or(z.literal("")),
  description: z.string().max(500, "Keep the description under 500 characters").optional().or(z.literal("")),
  parentId: z.string().optional().or(z.literal("")),
  order: z
    .string()
    .regex(/^\d*$/, "Display order must be a whole number")
    .optional()
    .or(z.literal("")),
  isActive: z.boolean().optional(),
  showInMenu: z.boolean().optional(),
  /*
   * ── Discovery flags ──────────────────────────────────────────────────────
   *
   * All four are in `CATEGORIES_UPDATABLE_FIELDS`, so the repository has
   * always accepted them — there was simply no form. An admin could not
   * feature a category, set its priority, or take it out of search, on a
   * taxonomy of 1,185 rows.
   */
  isFeatured: z.boolean().optional(),
  featuredPriority: z
    .string()
    .regex(/^\d*$/, "Priority must be a whole number")
    .optional()
    .or(z.literal("")),
  isSearchable: z.boolean().optional(),
  showOnHomepage: z.boolean().optional(),
  /*
   * `display.coverImage`, flattened into the draft because the form is flat.
   *
   * 🛑 THE DATA MODEL HAS ALWAYS CARRIED THIS AND THE EDITOR NEVER EXPOSED IT.
   * 504 category covers live in Storage, `resolveTaxonomyVisual` reads
   * `display.coverImage`, and the category page renders it — the only missing
   * piece was a way for an admin to set or change one. That is why the
   * taxonomy looked unfinished.
   *
   * Not validated as a URL: the value is either a `/media/<slug>` path minted
   * by the upload flow or empty, and a stricter rule here would reject the
   * former. An empty string is a legitimate value and means "cleared".
   */
  coverImage: z.string().optional().or(z.literal("")),
  // ── Content & Templates ──────────────────────────────────────────────────
  contentBody: z
    .string()
    .max(12000, "Keep the body under 12,000 characters")
    .optional()
    .or(z.literal("")),
  highlightsText: z.string().optional().or(z.literal("")),
  /*
   * The Hasbro / international-market name for a generation wave, rendered on
   * the category page as "Also known as". Editable here because wave naming is
   * editorial and gets corrected — the seed deliberately leaves it unset
   * wherever a divergence is not evidenced, and this is how one gets filled in
   * later without a reseed.
   */
  hasbroName: z.string().max(120, "Keep the name under 120 characters").optional().or(z.literal("")),
  taxCodeId: z.string().optional().or(z.literal("")),
  defaultCondition: z.string().optional().or(z.literal("")),
  defaultAuthenticity: z.string().optional().or(z.literal("")),
  inTheBoxText: z.string().optional().or(z.literal("")),
  seoTitleTemplate: z.string().max(200).optional().or(z.literal("")),
  seoDescriptionTemplate: z.string().max(400).optional().or(z.literal("")),
  seoKeywordsText: z.string().optional().or(z.literal("")),
  /*
   * Typed in a text input and sent through `Number()`, so validated as a
   * numeric STRING here rather than coerced — the same treatment `order`
   * already gets two fields up. A category default is a PACKED weight (C5a),
   * which is why the helper text says so: it drives the shipping estimate, and
   * seeding an item weight there under-estimates every booking.
   */
  weightG: z.string().regex(/^\d*$/, "Weight must be a whole number of grams").optional().or(z.literal("")),
  dimL: z.string().regex(/^\d*\.?\d*$/, "Length must be a number").optional().or(z.literal("")),
  dimW: z.string().regex(/^\d*\.?\d*$/, "Width must be a number").optional().or(z.literal("")),
  dimH: z.string().regex(/^\d*\.?\d*$/, "Height must be a number").optional().or(z.literal("")),
  fragile: z.boolean().optional(),
});

/**
 * Declared rather than `z.infer`d: the schema marks most fields optional (an
 * empty string is a legitimate value), but the DRAFT always holds a concrete
 * one. Inferring would give every field `| undefined`, which no longer satisfies
 * `Record<string, JsonValue>` and would push a `?? ""` into every render.
 */
interface CategoryFormValues {
  [key: string]: JsonValue;
  name: string;
  slug: string;
  description: string;
  parentId: string;
  order: string;
  isActive: boolean;
  showInMenu: boolean;
  isFeatured: boolean;
  featuredPriority: string;
  isSearchable: boolean;
  showOnHomepage: boolean;
  coverImage: string;
  contentBody: string;
  highlightsText: string;
  hasbroName: string;
  taxCodeId: string;
  defaultCondition: string;
  defaultAuthenticity: string;
  inTheBoxText: string;
  seoTitleTemplate: string;
  seoDescriptionTemplate: string;
  seoKeywordsText: string;
  weightG: string;
  dimL: string;
  dimW: string;
  dimH: string;
  fragile: boolean;
}

const EMPTY_VALUES: CategoryFormValues = {
  name: "",
  slug: "",
  description: "",
  parentId: "",
  order: "",
  isActive: true,
  showInMenu: true,
  isFeatured: false,
  featuredPriority: "",
  /* Searchable by DEFAULT — a new category nobody can find is a worse
     default than one that appears in results. */
  isSearchable: true,
  showOnHomepage: false,
  coverImage: "",
  contentBody: "",
  highlightsText: "",
  hasbroName: "",
  taxCodeId: "",
  defaultCondition: "",
  defaultAuthenticity: "",
  inTheBoxText: "",
  seoTitleTemplate: "",
  seoDescriptionTemplate: "",
  seoKeywordsText: "",
  weightG: "",
  dimL: "",
  dimW: "",
  dimH: "",
  fragile: false,
};

const __P = {
  p4: "p-[var(--appkit-space-4)]",
} as const;

const __O = {
  yAuto: "overflow-y-auto",
} as const;

export interface AdminCategoryEditorViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  categoryId?: string;
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
  embedded?: boolean;
}

interface CategoryPayload {
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  parentId?: string;
  order?: number;
  isActive: boolean;
  /*
   * Discovery flags — TOP-LEVEL, not under `display`, so the replace-vs-merge
   * hazard described below does not touch them.
   *
   * `featuredPriority` is optional because "" means not set: `Number("")` is
   * 0, which is a real and meaningful priority, so an empty input must send
   * `undefined` rather than coerce to the top of the list.
   */
  isFeatured?: boolean;
  featuredPriority?: number;
  isSearchable?: boolean;
  showOnHomepage?: boolean;
  /*
   * 🛑 A PARTIAL MAP, and the route merges it over the stored one.
   *
   * `BaseRepository.update` hands a nested map to `doc().update()`, which
   * REPLACES it — so sending `{ showInMenu }` alone used to delete
   * `coverImage`, `icon`, `color`, `mosaicImages` and `showInFooter` on every
   * save. `PATCH /api/admin/categories/[id]` now merges, which is what the two
   * sublisting-category routes have always done.
   */
  display?: { showInMenu: boolean; coverImage?: string };
  // ── Content & Templates. EDIT ONLY — see buildContentPayload. ───────────
  contentBody?: string;
  highlights?: string[];
  faqs?: CategoryFaq[];
  hasbroName?: string;
  descriptionTemplates?: CategoryTemplateRow[];
  /*
   * The REAL type, not a `Record<string, unknown>`.
   *
   * The loose version typechecked and then every hydration read came back as
   * `{}` — `cat.productDefaults?.dimensionsCm?.l` does not exist on an index
   * signature of `unknown`, and the fix available at each of those fifteen
   * sites would have been a cast. One honest type at the boundary instead;
   * `audit-unknown-leakage` exists for exactly this.
   */
  productDefaults?: CategoryProductDefaults;
}

async function loadCategoryOptions(query: string, page: number) {
  const params = new URLSearchParams({ page: String(page), pageSize: "25" });
  if (query) params.set("q", query);
  const res = await apiClient.get(`${ADMIN_ENDPOINTS.CATEGORIES}?${params.toString()}`);
  // apiClient returns the full response; the route wraps items in successResponse({ data: [...] })
  const payload = (res as any)?.data ?? res;
  const items: { id: string; name: string }[] = payload?.data ?? payload?.items ?? [];
  return {
    items: items.map((c) => ({ value: c.id, label: c.name })),
    hasMore: payload?.hasMore ?? false,
  };
}

/**
 * The content half of the PUT payload.
 *
 * 🛑 Every field is sent on EVERY save, including as an empty array or an
 * omitted key — because the route spreads this straight into
 * `categoriesRepository.update()`, and an admin who DELETES all five
 * highlights must end up with no highlights rather than with the old five.
 * Only sending non-empty values is how a removal silently fails, which is the
 * defect the whole C2b-fix commit was about one layer down.
 *
 * `productDefaults` is rebuilt whole rather than merged, for the same reason —
 * clearing the tax code has to mean clearing it. The advisory
 * `priceGuidance` half is CARRIED THROUGH from the loaded document and never
 * edited here: it is seed-owned market data plus C1's rollup output, and an
 * editor that round-tripped it would let an admin overwrite a measured band by
 * hand with nothing recording that they had.
 */
function buildContentPayload(
  v: CategoryFormValues,
  faqs: CategoryFaq[],
  specs: CategorySpecRow[],
  templates: CategoryTemplateRow[],
  carriedPriceGuidance?: CategoryPriceGuidance,
): Partial<CategoryPayload> {
  const num = (s: string): number | undefined => {
    const t = s.trim();
    if (t === "") return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  };
  const str = (s: JsonValue | undefined): string | undefined => {
    const t = String(s ?? "").trim();
    return t === "" ? undefined : t;
  };
  const list = (s: JsonValue | undefined): string[] | undefined => {
    const out = linesToList(String(s ?? ""));
    return out.length === 0 ? undefined : out;
  };
  const l = num(String(v.dimL ?? ""));
  const w = num(String(v.dimW ?? ""));
  const h = num(String(v.dimH ?? ""));
  const keptSpecs = specs.filter((s) => s.name.trim() !== "" && s.value.trim() !== "");
  const authenticity = str(v.defaultAuthenticity);

  /*
   * Assembled field by field rather than through a `Record<string, unknown>`
   * accumulator. The accumulator version was shorter and `audit-unknown-leakage`
   * was right to reject it: `unknown` in a payload builder is how a wrong key
   * or a wrong shape reaches Firestore with nothing to catch it, and this
   * object's whole job is to be the right shape.
   */
  const defaults: CategoryProductDefaults = {
    ...(str(v.taxCodeId) ? { taxCodeId: str(v.taxCodeId) } : {}),
    ...(str(v.defaultCondition) ? { defaultCondition: str(v.defaultCondition) } : {}),
    ...(authenticity === "original" || authenticity === "reproduction" || authenticity === "unverified"
      ? { defaultAuthenticity: authenticity }
      : {}),
    ...(list(v.inTheBoxText) ? { inTheBox: list(v.inTheBoxText) } : {}),
    ...(str(v.seoTitleTemplate) ? { seoTitleTemplate: str(v.seoTitleTemplate) } : {}),
    ...(str(v.seoDescriptionTemplate)
      ? { seoDescriptionTemplate: str(v.seoDescriptionTemplate) }
      : {}),
    ...(list(v.seoKeywordsText) ? { seoKeywords: list(v.seoKeywordsText) } : {}),
    ...(num(String(v.weightG ?? "")) != null ? { weightG: num(String(v.weightG ?? "")) } : {}),
    ...(keptSpecs.length > 0 ? { specifications: keptSpecs } : {}),
    // All three or none — a box with a length and no width is not a dimension.
    ...(l != null && w != null && h != null ? { dimensionsCm: { l, w, h } } : {}),
    ...(v.fragile === true ? { fragile: true } : {}),
    ...(carriedPriceGuidance !== undefined ? { priceGuidance: carriedPriceGuidance } : {}),
  };

  return {
    contentBody: String(v.contentBody ?? ""),
    highlights: linesToList(String(v.highlightsText ?? "")),
    faqs: faqs.filter((f) => f.question.trim() !== "" && f.answer.trim() !== ""),
    /*
     * Omitted when blank rather than sent as `""`. The route schema is
     * `.min(1)`, so an empty string is a 400 — and "I cleared the field" has
     * to mean "do not write it", not "write an empty string every reader then
     * has to treat as absent".
     */
    ...(String(v.hasbroName ?? "").trim() ? { hasbroName: String(v.hasbroName).trim() } : {}),
    descriptionTemplates: templates
      .filter((t) => t.label.trim() !== "" && t.body.trim() !== "")
      .map((t) => ({ ...t, id: t.id || toCategorySlug(t.label) || "template" })),
    productDefaults: defaults,
  };
}

function toCategorySlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminCategoryEditorView({
  categoryId,
  onSaved,
  onDeleted,
  embedded,
  ...rest
}: AdminCategoryEditorViewProps) {
  const isEdit = Boolean(categoryId);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const { upload } = useMediaUpload();

  const [values, setValues] = React.useState<CategoryFormValues>(EMPTY_VALUES);
  /*
   * The three repeater arrays live OUTSIDE `values`.
   *
   * `CategoryFormValues` carries an index signature of `JsonValue` so
   * `SectionForm` can map a Zod path back to the panel that owns it, and an
   * array of objects satisfies that only after a cast at every read. Keeping
   * them as their own typed state costs one extra dependency on the sections
   * memo and buys real types at every use — the alternative is a `as any` in a
   * render loop, which is where this codebase's worst defects live.
   */
  const [faqs, setFaqs] = React.useState<CategoryFaq[]>([]);
  const [specs, setSpecs] = React.useState<CategorySpecRow[]>([]);
  const [templates, setTemplates] = React.useState<CategoryTemplateRow[]>([]);
  /* UI state, not a form value — whether the user has taken the slug over. */
  const [slugManual, setSlugManual] = React.useState(false);
  const { showToast } = useToast();

  const handleChange = React.useCallback((partial: Partial<CategoryFormValues>) => {
    setValues((prev) => {
      // Object.assign, not a spread: spreading a `Partial<T>` widens every
      // property to `| undefined`, which no longer satisfies the index
      // signature. The intersection Object.assign returns does.
      const next: CategoryFormValues = Object.assign({}, prev, partial);
      // Slug tracks the name until the user edits it, and `slugManual` is what
      // stops it snapping back afterwards.
      if (partial.name !== undefined && !slugManual) next.slug = toCategorySlug(String(partial.name));
      return next;
    });
  }, [slugManual]);

  const categoryQuery = useQuery({
    queryKey: ["admin", "category", categoryId],
    queryFn: async () => {
      const res = await apiClient.get(ADMIN_ENDPOINTS.CATEGORY_BY_ID(categoryId!));
      return (res as any)?.data ?? res;
    },
    enabled: isEdit,
  });

  React.useEffect(() => {
    const cat = categoryQuery.data as CategoryPayload | undefined;
    if (!cat) return;
    setSlugManual(true);
    setValues({
      name: cat.name ?? "",
      slug: cat.slug ?? "",
      description: cat.description ?? "",
      parentId:
        (cat as any).parentId ??
        (cat as any).parentIds?.[(cat as any).parentIds?.length - 1] ??
        "",
      order: cat.order !== undefined ? String(cat.order) : "",
      isActive: cat.isActive ?? true,
      showInMenu: cat.display?.showInMenu ?? true,
      isFeatured: cat.isFeatured ?? false,
      featuredPriority:
        cat.featuredPriority !== undefined ? String(cat.featuredPriority) : "",
      isSearchable: cat.isSearchable ?? true,
      showOnHomepage: cat.showOnHomepage ?? false,
      coverImage: cat.display?.coverImage ?? "",
      contentBody: cat.contentBody ?? "",
      highlightsText: listToLines(cat.highlights),
      hasbroName: cat.hasbroName ?? "",
      taxCodeId: cat.productDefaults?.taxCodeId ?? "",
      defaultCondition: cat.productDefaults?.defaultCondition ?? "",
      defaultAuthenticity: cat.productDefaults?.defaultAuthenticity ?? "",
      inTheBoxText: listToLines(cat.productDefaults?.inTheBox),
      seoTitleTemplate: cat.productDefaults?.seoTitleTemplate ?? "",
      seoDescriptionTemplate: cat.productDefaults?.seoDescriptionTemplate ?? "",
      seoKeywordsText: listToLines(cat.productDefaults?.seoKeywords),
      weightG: cat.productDefaults?.weightG != null ? String(cat.productDefaults.weightG) : "",
      dimL: cat.productDefaults?.dimensionsCm?.l != null ? String(cat.productDefaults.dimensionsCm.l) : "",
      dimW: cat.productDefaults?.dimensionsCm?.w != null ? String(cat.productDefaults.dimensionsCm.w) : "",
      dimH: cat.productDefaults?.dimensionsCm?.h != null ? String(cat.productDefaults.dimensionsCm.h) : "",
      fragile: cat.productDefaults?.fragile ?? false,
    });
    setFaqs((cat.faqs ?? []).map((f) => ({ ...f })));
    setSpecs((cat.productDefaults?.specifications ?? []).map((s) => ({ ...s })));
    setTemplates(
      (cat.descriptionTemplates ?? []).map((t) => ({
        id: t.id,
        label: t.label,
        variant: t.variant,
        body: t.body,
      })),
    );
  }, [categoryQuery.data]);

  const saveMutation = useApiMutation({
    errorMessage: "Failed to save category.",
    mutationFn: async () => {
      const name = String(values.name ?? "");
      const payload: CategoryPayload = {
        name,
        slug: String(values.slug ?? "") || toCategorySlug(name),
        description: String(values.description ?? "") || undefined,
        parentId: String(values.parentId ?? "") || undefined,
        order: values.order !== "" && values.order !== undefined ? Number(values.order) : undefined,
        isActive: values.isActive ?? true,
        isFeatured: values.isFeatured ?? false,
        featuredPriority:
          values.featuredPriority !== "" && values.featuredPriority !== undefined
            ? Number(values.featuredPriority)
            : undefined,
        isSearchable: values.isSearchable ?? true,
        showOnHomepage: values.showOnHomepage ?? false,
        /*
         * `coverImage` is sent even when empty — an empty string is how the
         * admin says "remove the cover", and omitting it would make clearing
         * the field a no-op now that the route merges rather than replaces.
         * Every reader trims and tests truthiness, so `""` reads as absent.
         */
        display: {
          showInMenu: values.showInMenu ?? true,
          coverImage: String(values.coverImage ?? ""),
        },
      };
      if (isEdit) {
        /*
         * 🛑 The content fields go on the PUT only, and that is not a
         * limitation to work around.
         *
         * `POST /api/admin/categories`' schema is a `z.object()` naming nine
         * keys, and Zod STRIPS unknown ones — so sending a description
         * template on create would return 200, show a success toast and write
         * nothing (Root Cause #76b, the admin grouped-listings shape). The
         * section renders only in edit mode so the form never shows a field it
         * is about to discard.
         *
         * It is also the right workflow: creating a category is naming it and
         * placing it in the tree. Writing its SEO body and its five
         * description templates is a separate sitting.
         */
        return apiClient.put(ADMIN_ENDPOINTS.CATEGORY_BY_ID(categoryId!), {
          ...payload,
          ...buildContentPayload(
            values,
            faqs,
            specs,
            templates,
            (categoryQuery.data as CategoryPayload | undefined)?.productDefaults?.[
              "priceGuidance"
            ],
          ),
        });
      }
      return apiClient.post(ADMIN_ENDPOINTS.CATEGORIES, payload);
    },
    onSuccess: (res: JsonValue) => {
      const id = (res as any)?.data?.id ?? (res as any)?.id ?? categoryId;
      showToast(isEdit ? "Category updated." : "Category created.", "success");
      if (onSaved && id) onSaved(id);
    },
  });

  const deleteMutation = useApiMutation({
    errorMessage: "Failed to delete category.",
    mutationFn: () => apiClient.delete(ADMIN_ENDPOINTS.CATEGORY_BY_ID(categoryId!)),
    onSuccess: () => {
      showToast("Category deleted.", "success");
      if (onDeleted) onDeleted();
    },
  });

  const isSubmitting = saveMutation.isPending || categoryQuery.isLoading;

  /*
   * The sections. Order comes from `required` first, then the group band
   * (`basics` -> required, `visibility` -> visibility), so "mandatory first,
   * least important last" needs no per-form sectionOrder.
   *
   * `fields` is what makes the error summary's jump links and the per-section
   * error badge work — it is the map from a Zod path back to the panel holding
   * that control.
   */
  const sections = React.useMemo<SectionDef<CategoryFormValues>[]>(() => [
    {
      id: "basics",
      label: "Identity",
      required: true,
      fields: ["name", "slug", "description", "parentId"],
      render: ({ values: v, onChange, errors }) => (
        <Stack gap="md">
          <Div layout="grid" gap="4" className="sm:grid-cols-2">
            <FieldInput
              name="name"
              label="Category name"
              value={String(v.name ?? "")}
              onChange={(val) => onChange({ name: val })}
              required
              placeholder="e.g. Toys & Games"
              error={errors.name}
            />
            <Input
              label="Slug"
              value={String(v.slug ?? "")}
              onChange={(e) => {
                setSlugManual(true);
                onChange({ slug: e.target.value });
              }}
              placeholder="toys-and-games"
              helperText="Auto-generated from the name until you edit it. Used in URLs."
              error={errors.slug}
            />
          </Div>
          <Input
            label="Description"
            value={String(v.description ?? "")}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Brief description of the category"
            error={errors.description}
          />
          <Stack gap="xs">
            <Text size="sm" weight="medium" color="muted">
              Parent category
            </Text>
            <PaginatedSelect
              value={String(v.parentId ?? "") || null}
              onChange={(val) => onChange({ parentId: val ?? "" })}
              loadOptions={loadCategoryOptions}
              placeholder="Search categories… (leave empty for root)"
              searchPlaceholder="Type category name…"
              noResultsText="No categories found"
              ariaLabel="Parent category"
              createLabel="Category"
              renderCreateForm={({ onCreated, onCancel }) => (
                <CategoryQuickCreateForm
                  onSaved={(id, n) => {
                    onChange({ parentId: id });
                    onCreated({ value: id, label: n });
                  }}
                  onCancel={onCancel}
                />
              )}
            />
            <Text size="xs" color="muted">
              Leave empty to create a root category.
            </Text>
          </Stack>
        </Stack>
      ),
    },
    {
      id: "visibility",
      label: "Display",
      fields: ["order", "isActive", "showInMenu", "coverImage", "isFeatured", "featuredPriority", "isSearchable", "showOnHomepage"],
      render: ({ values: v, onChange, errors }) => (
        <Stack gap="md">
          {/*
            The cover the category page's hero and every category card render,
            through `resolveTaxonomyVisual`. First in the section because it is
            the only field here a visitor actually sees.

            🛑 An emoji in `display.icon` no longer beats this. The precedence
            in `resolveTaxonomyVisual` was "icon, whatever it holds, then
            cover" until 2026-10-20, which meant the twelve forest roots —
            every one of which carries a decorative 🪀 — would have rendered
            the emoji over a cover uploaded here and this field would have
            looked broken. It is now URL-icon, then cover, then emoji, so a
            root keeps its emoji for menus and shows the photograph on its
            page. There is deliberately no `icon` input: one ambiguous field
            that two conventions write to does not need a third writer.
          */}
          <ImageUpload
            label="Cover image"
            helperText="Shown on the category page hero and on category cards."
            currentImage={String(v.coverImage ?? "")}
            onUpload={(file) =>
              upload(file, "categories", true, {
                type: "category-image",
                // The filename is content-derived, so re-uploading for the
                // same category overwrites at the same storage path rather
                // than orphaning the previous object.
                name: String(v.name ?? "") || String(v.slug ?? ""),
              })
            }
            onChange={(url) => onChange({ coverImage: url })}
          />
          <Input
            label="Display order"
            value={String(v.order ?? "")}
            onChange={(e) => onChange({ order: e.target.value })}
            type="number"
            min={0}
            placeholder="0"
            error={errors.order}
          />
          <Toggle
            label="Active"
            checked={v.isActive ?? true}
            onChange={(checked) => onChange({ isActive: checked })}
          />
          <Toggle
            label="Show in menu"
            checked={v.showInMenu ?? true}
            onChange={(checked) => onChange({ showInMenu: checked })}
          />
          {/*
            🛑 THE FOUR DISCOVERY FLAGS, none of which had a control.

            All four are in `CATEGORIES_UPDATABLE_FIELDS`, so the repository
            has always accepted them — there was simply nowhere to set them.
            On a taxonomy of 1,185 rows that meant no category could be
            featured, prioritised, or taken out of search from the UI at all.
          */}
          <Toggle
            label="Searchable"
            checked={v.isSearchable ?? true}
            onChange={(checked) => onChange({ isSearchable: checked })}
          />
          <Toggle
            label="Featured"
            checked={v.isFeatured ?? false}
            onChange={(checked) => onChange({ isFeatured: checked })}
          />
          {/*
            Priority is only meaningful once featured, so it is hidden until
            then rather than shown disabled — a number input that cannot
            affect anything invites someone to fill it in and wonder why
            nothing moved.
          */}
          {(v.isFeatured ?? false) ? (
            <Input
              label="Featured priority"
              value={String(v.featuredPriority ?? "")}
              onChange={(e) => onChange({ featuredPriority: e.target.value })}
              type="number"
              min={0}
              placeholder="0"
              helperText="Lower sorts first among featured categories."
              error={errors.featuredPriority}
            />
          ) : null}
          <Toggle
            label="Show on homepage"
            checked={v.showOnHomepage ?? false}
            onChange={(checked) => onChange({ showOnHomepage: checked })}
          />
        </Stack>
      ),
    },
    /*
     * 🛑 EDIT ONLY. The create route's `z.object()` would strip every one of
     * these and answer 200, so the form must not offer them yet. See
     * buildContentPayload's header.
     */
    ...(isEdit
      ? [
          {
            id: "content",
            label: "Content & Templates",
            fields: ["contentBody", "highlightsText", "hasbroName"],
            render: ({ values: v, onChange, errors }) => (
              <Stack gap="md">
                <Stack gap="xs">
                  <Textarea
                    label="Category page body"
                    value={String(v.contentBody ?? "")}
                    onChange={(e) => onChange({ contentBody: e.target.value })}
                    rows={8}
                    placeholder="400–900 characters of keyword-rich HTML with links to sibling and parent categories…"
                  />
                  {errors.contentBody ? (
                    <Text size="sm" variant="error" role="alert">{errors.contentBody}</Text>
                  ) : (
                    <Text size="xs" color="muted">
                      Rendered on the category page. Distinct from the short
                      Description above, which also feeds the SEO meta and every
                      card. 36 of worldhobbyshop&apos;s 46 categories carry one of
                      these and it is their actual ranking mechanism; no Shopify
                      competitor in the crawl has any.
                    </Text>
                  )}
                </Stack>

                <FieldInput
                  name="hasbroName"
                  label="Hasbro / international name"
                  value={String(v.hasbroName ?? "")}
                  onChange={(val) => onChange({ hasbroName: val })}
                  placeholder="e.g. Beyblade Burst Turbo"
                  error={errors.hasbroName}
                  hint="Only when the Hasbro season name genuinely differs from the Takara-Tomy one — Cho-Z ships as Turbo, God as Evolution. Rendered on the category page as 'Also known as'. Leave blank if there is no divergence, or if you cannot confirm one: a guessed pairing reads as fact."
                />

                <Stack gap="xs">
                  <Textarea
                    label="Highlights — one per line"
                    value={String(v.highlightsText ?? "")}
                    onChange={(e) => onChange({ highlightsText: e.target.value })}
                    rows={4}
                    placeholder={"Genuine Takara Tomy stock\nChecked and photographed before listing"}
                  />
                  <Text size="xs" color="muted">
                    Short &quot;why shop this&quot; bullets, shown above the FAQs.
                    Blank lines are dropped. Up to 12.
                  </Text>
                </Stack>

                <Stack gap="xs">
                  <Text size="sm" weight="medium">Category FAQs</Text>
                  <Text size="xs" color="muted">
                    Rendered as an accordion on the category page and emitted as
                    FAQPage structured data. Keep platform-wide answers in the
                    global FAQ collection instead — two copies of one answer
                    means the one that gets fixed is never the one being read.
                  </Text>
                  <Repeater
                    rows={faqs}
                    onChange={setFaqs}
                    blank={() => ({ question: "", answer: "" })}
                    addLabel="Add an FAQ"
                    max={20}
                    renderRow={(row, set) => (
                      <>
                        <Input
                          label="Question"
                          value={row.question}
                          onChange={(e) => set({ question: e.target.value })}
                          placeholder="Are these compatible with Burst launchers?"
                        />
                        <Textarea
                          value={row.answer}
                          onChange={(e) => set({ answer: e.target.value })}
                          rows={3}
                          placeholder="Answer…"
                        />
                      </>
                    )}
                  />
                </Stack>

                <Stack gap="xs">
                  <Text size="sm" weight="medium">Description templates</Text>
                  <Text size="xs" color="muted">
                    What the seller form offers when a listing is filed here. One
                    per condition band — worldhobbyshop reuses exactly two across
                    1,195 listings. Slots like{" "}
                    <Span family="mono">{"{{title}}"}</Span>,{" "}
                    <Span family="mono">{"{{brand}}"}</Span>,{" "}
                    <Span family="mono">{"{{condition}}"}</Span> and{" "}
                    <Span family="mono">{"{{series}}"}</Span> are filled from the
                    listing; an unresolved one becomes empty and is reported to the
                    seller, never left as a literal brace pair.
                  </Text>
                  <Repeater
                    rows={templates}
                    onChange={setTemplates}
                    blank={() => ({ id: "", label: "", variant: "default", body: "" })}
                    addLabel="Add a template"
                    max={8}
                    renderRow={(row, set) => (
                      <>
                        <Div layout="grid" gap="4" className="sm:grid-cols-2">
                          <Input
                            label="Label"
                            value={row.label}
                            onChange={(e) => set({ label: e.target.value })}
                            placeholder="Pre-owned — condition as pictured"
                          />
                          <Select
                            label="Condition band"
                            value={row.variant}
                            onChange={(e) => set({ variant: e.target.value })}
                            options={TEMPLATE_VARIANT_OPTIONS}
                          />
                        </Div>
                        <Textarea
                          value={row.body}
                          onChange={(e) => set({ body: e.target.value })}
                          rows={6}
                          placeholder="Important things to know about {{title}} — HTML permitted…"
                        />
                        <Text size="xs" color="muted">
                          {usedPlaceholders(row.body).length > 0
                            ? `Slots used: ${usedPlaceholders(row.body).map((p) => `{{${p}}}`).join(", ")}`
                            : "No slots used — this body will read identically on every listing."}
                        </Text>
                      </>
                    )}
                  />
                </Stack>
              </Stack>
            ),
          } satisfies SectionDef<CategoryFormValues>,
          {
            id: "defaults",
            label: "Product defaults",
            fields: ["taxCodeId", "weightG", "dimL", "dimW", "dimH", "seoTitleTemplate", "seoDescriptionTemplate"],
            render: ({ values: v, onChange, errors }) => (
              <Stack gap="md">
                <Text size="xs" color="muted">
                  What a listing filed under this category inherits. Written
                  server-side when the product omits the field, and resolved PER
                  FIELD up the ancestor chain — so a named-model leaf can supply
                  its own features while the tax code and spec rows come from the
                  line above it.
                </Text>

                <Stack gap="xs">
                  <Text size="sm" weight="medium">Tax code</Text>
                  <PaginatedSelect
                    value={String(v.taxCodeId ?? "") || null}
                    onChange={(val) => onChange({ taxCodeId: val ?? "" })}
                    loadOptions={loadTaxCodeOptions}
                    placeholder="Search tax codes…"
                    searchPlaceholder="HSN or label…"
                    noResultsText="No tax codes found"
                    ariaLabel="Tax code"
                  />
                  <Text size="xs" color="muted">
                    🛑 This is the GST mechanism, not a nicety. A listing whose
                    category resolves no tax code falls back to a default rate
                    and is flagged for triage — and the measure of success is
                    that the fallback fires for nothing.
                  </Text>
                </Stack>

                <Div layout="grid" gap="4" className="sm:grid-cols-2">
                  <Select
                    label="Default condition"
                    value={String(v.defaultCondition ?? "")}
                    onChange={(e) => onChange({ defaultCondition: e.target.value })}
                    options={CONDITION_DEFAULT_OPTIONS}
                  />
                  <Select
                    label="Default authenticity"
                    value={String(v.defaultAuthenticity ?? "")}
                    onChange={(e) => onChange({ defaultAuthenticity: e.target.value })}
                    options={AUTHENTICITY_OPTIONS}
                  />
                </Div>

                <Stack gap="xs">
                  <Text size="sm" weight="medium">Specification rows</Text>
                  <Repeater
                    rows={specs}
                    onChange={setSpecs}
                    blank={() => ({ name: "", value: "", unit: "" })}
                    addLabel="Add a specification"
                    max={20}
                    renderRow={(row, set) => (
                      <Div layout="grid" gap="4" className="sm:grid-cols-3">
                        <Input label="Name" value={row.name} onChange={(e) => set({ name: e.target.value })} placeholder="System" />
                        <Input label="Value" value={row.value} onChange={(e) => set({ value: e.target.value })} placeholder="Magne Core" />
                        <Input label="Unit" value={row.unit ?? ""} onChange={(e) => set({ unit: e.target.value })} placeholder="g" />
                      </Div>
                    )}
                  />
                </Stack>

                <Stack gap="xs">
                  {/* A JSX *attribute* takes a real apostrophe — `&apos;` is
                      only escaped in children, and would print literally. */}
                  <Textarea
                    label="What's in the box — one per line"
                    value={String(v.inTheBoxText ?? "")}
                    onChange={(e) => onChange({ inTheBoxText: e.target.value })}
                    rows={4}
                    placeholder={"Beyblade top\nLauncher\nRipcord\nManual"}
                  />
                  <Text size="xs" color="muted">
                    Read by the description-template endpoint to fill the
                    new-in-box body&apos;s list. Deliberately NOT written to the
                    product&apos;s `features` field, which holds feature ids —
                    putting prose there would break every facet on the listing.
                  </Text>
                </Stack>

                <Div layout="grid" gap="4" className="sm:grid-cols-2">
                  <Input
                    label="SEO title template"
                    value={String(v.seoTitleTemplate ?? "")}
                    onChange={(e) => onChange({ seoTitleTemplate: e.target.value })}
                    placeholder="{{title}} — {{brand}} | {{siteName}}"
                    error={errors.seoTitleTemplate}
                  />
                  <Input
                    label="SEO description template"
                    value={String(v.seoDescriptionTemplate ?? "")}
                    onChange={(e) => onChange({ seoDescriptionTemplate: e.target.value })}
                    placeholder="Buy {{title}} in India…"
                    error={errors.seoDescriptionTemplate}
                  />
                </Div>

                <Stack gap="xs">
                  <Textarea
                    label="SEO keywords — one per line"
                    value={String(v.seoKeywordsText ?? "")}
                    onChange={(e) => onChange({ seoKeywordsText: e.target.value })}
                    rows={3}
                  />
                </Stack>

                <Div layout="grid" gap="4" className="sm:grid-cols-4">
                  <Input
                    label="Packed weight (g)"
                    value={String(v.weightG ?? "")}
                    onChange={(e) => onChange({ weightG: e.target.value })}
                    placeholder="300"
                    error={errors.weightG}
                    helperText="Boxed, not the bare item."
                  />
                  <Input label="Length (cm)" value={String(v.dimL ?? "")} onChange={(e) => onChange({ dimL: e.target.value })} error={errors.dimL} />
                  <Input label="Width (cm)" value={String(v.dimW ?? "")} onChange={(e) => onChange({ dimW: e.target.value })} error={errors.dimW} />
                  <Input label="Height (cm)" value={String(v.dimH ?? "")} onChange={(e) => onChange({ dimH: e.target.value })} error={errors.dimH} />
                </Div>
                <Text size="xs" color="muted">
                  🛑 The weight is a PACKED weight — a bey is ~30 g and ~300 g
                  boxed. This figure drives the shipping estimate the buyer pays,
                  and the seller&apos;s booking is capped at what was collected,
                  so an item weight here under-estimates every booking and the
                  difference is absorbed silently. All three dimensions or none.
                </Text>
                <Toggle
                  label="Fragile by default"
                  checked={v.fragile === true}
                  onChange={(checked) => onChange({ fragile: checked })}
                />
              </Stack>
            ),
          } satisfies SectionDef<CategoryFormValues>,
        ]
      : []),
  ], [isEdit, faqs, specs, templates]);

  const nav = useSectionFormNav(sections, values);
  const { shellCtx } = useFormShellState(categoryFormSchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });

  /*
   * The sidebar is STATUS ONLY now.
   *
   * It used to carry its own Save and Delete, and the Save was dead: it was
   * `type="submit"` against a `<Form onSubmit={(e) => e.preventDefault()}>`
   * with no onClick of its own, while the only call to `saveMutation.mutate()`
   * lived in a second, `lg:hidden` button row. The two were mutually exclusive
   * by breakpoint, so on any desktop viewport the admin category editor could
   * not save at all. One action list rendered twice is what makes that
   * unrepresentable.
   */
  const actionSidebar = (
    <FormShellContext.Provider value={shellCtx}>
      <Card variant="outlined" padding="md" spacing="sm">
        <Text className="tracking-widest" color="muted" size="xs" weight="semibold" transform="uppercase">
          Status
        </Text>
        <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
          {isEdit ? (values.isActive ? "Active" : "Inactive") : "New"}
        </Text>
        <FormErrorSummary />
      </Card>
    </FormShellContext.Provider>
  );

  const formContent = (
    <FormShellContext.Provider value={shellCtx}>
      <SectionForm<CategoryFormValues>
        sections={sections}
        values={values}
        onChange={handleChange}
        onSubmit={() => saveMutation.mutate()}
        schema={categoryFormSchema}
        openIds={nav.openIds}
        onOpenChange={nav.setOpenIds}
        isLoading={isSubmitting}
        submitLabel={isEdit ? "Save changes" : "Create category"}
        destructiveAction={
          isEdit
            ? {
                label: "Delete category",
                onClick: () => setDeleteOpen(true),
                disabled: deleteMutation.isPending,
              }
            : undefined
        }
      />
    </FormShellContext.Provider>
  );


  if (embedded) {
    return <Div className={`${__O.yAuto} ${__P.p4}`}>{formContent}</Div>;
  }

  const twoPanel = (
    <Div layout="grid" gap="6" lgAlign="start" className="lg:grid-cols-[1fr_280px]">
      <CardBody className="min-w-0 space-y-6 p-[var(--appkit-space-0)]">{formContent}</CardBody>
      <Show above="lg">
        <StickyToolbar offset="header" tone="default" border={false} padding="none">
          {actionSidebar}
        </StickyToolbar>
      </Show>
    </Div>
  );

  return (
    <>
      <StackedViewShell
        portal="admin"
        {...rest}
        title={isEdit ? "Edit Category" : "Create Category"}
        sections={[twoPanel]}
      />
      <ConfirmDeleteModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        isDeleting={deleteMutation.isPending}
        title="Delete this category?"
        message="Products in this category will become uncategorized. This action cannot be undone."
        confirmText="Delete category"
        variant="danger"
      />
    </>
  );
}
