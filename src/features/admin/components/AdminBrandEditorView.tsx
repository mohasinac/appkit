"use client";

/**
 * Create or edit a brand.
 *
 * Fields come from `brandFormSchema`, which used to be declared locally in this
 * file, unannotated, and — the part that mattered — never executed: the submit
 * handler checked `name.trim()` and called the mutation. So `website`'s URL rule
 * had never rejected anything, and the raw `<Input>`s it would have reported on
 * carry no `name`, which means `applyZodIssues` had nowhere to put an error even
 * if the parse had run. Both halves are fixed by deriving the form from the
 * schema: every field is a `Field*` with a name, and the parse gates the save.
 *
 * The submit button is no longer `disabled={!name}`. A disabled control with no
 * explanation cannot tell the admin which field it is waiting on; the schema now
 * says so, on the field.
 */

import React from "react";
import { useQuery } from "@tanstack/react-query";

import { useApiMutation, type JsonValue } from "@mohasinac/appkit/client";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { apiClient } from "../../../http";
import { ConfirmDeleteModal, Div, StackedViewShell, useToast } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { applyZodIssues } from "../../../ui/forms/apply-zod-issues";
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";
import { FormShellContext, useFormShellState } from "../../../ui/forms/FormShell";
import { buildSectionsFromSchema } from "../../shell/build-sections";
import { SectionForm, useSectionFormNav } from "../../shell/SectionForm";
import { useMediaUpload } from "../../media";
import { ImageUpload } from "../../media/upload/ImageUpload";
import { brandFormSchema } from "../schemas/admin-editor-forms";

const __P = { p4: "p-[var(--appkit-space-4)]" } as const;
const __O = { yAuto: "overflow-y-auto" } as const;

export interface AdminBrandEditorViewProps extends Omit<StackedViewShellProps, "sections"> {
  brandId?: string;
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
  /** When true, renders form only (no StackedViewShell) for use inside a SideDrawer. */
  embedded?: boolean;
}

interface BrandPayload {
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  logoURL?: string;
  website?: string;
  country?: string;
  founded?: number;
  isActive: boolean;
  displayOrder?: number;
}

interface Values {
  [key: string]: unknown;
  name: string;
  slug: string;
  description: string;
  logoURL: string;
  website: string;
  country: string;
  founded: string;
  isActive: boolean;
  displayOrder: string;
}

const EMPTY: Values = {
  name: "",
  slug: "",
  description: "",
  logoURL: "",
  website: "",
  country: "",
  founded: "",
  isActive: true,
  displayOrder: "",
};

function toBrandSlug(str: string): string {
  const base = str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.startsWith("brand-") ? base : `brand-${base}`;
}

/** `""` means "not set" — `Number("")` is 0, which is a real display order. */
function optionalNumber(raw: string): number | undefined {
  return raw.trim() === "" ? undefined : Number(raw);
}

export function AdminBrandEditorView({
  brandId,
  onSaved,
  onDeleted,
  embedded,
  ...rest
}: AdminBrandEditorViewProps) {
  const isEdit = Boolean(brandId);
  const [form, setForm] = React.useState<Values>(EMPTY);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const { showToast } = useToast();
  const { upload } = useMediaUpload();

  const brandQuery = useQuery({
    queryKey: ["admin", "brand", brandId],
    queryFn: async () => {
      const res = (await apiClient.get(ADMIN_ENDPOINTS.BRAND_BY_ID(brandId!))) as unknown;
      return ((res as { data?: BrandPayload })?.data ?? res) as BrandPayload;
    },
    enabled: isEdit,
  });

  React.useEffect(() => {
    const brand = brandQuery.data as BrandPayload | undefined;
    if (!brand) return;
    setForm({
      name: brand.name ?? "",
      slug: brand.slug ?? "",
      description: brand.description ?? "",
      logoURL: brand.logoURL ?? "",
      website: brand.website ?? "",
      country: brand.country ?? "",
      founded: brand.founded !== undefined ? String(brand.founded) : "",
      isActive: brand.isActive ?? true,
      displayOrder: brand.displayOrder !== undefined ? String(brand.displayOrder) : "",
    });
  }, [brandQuery.data]);

  const sections = React.useMemo(
    () =>
      buildSectionsFromSchema<Values>(brandFormSchema, {
        renderers: {
          logoURL: ({ values, onChange }) => (
            <ImageUpload
              label="Cover image"
              currentImage={values.logoURL as string}
              onUpload={(file) =>
                upload(file, "brands", true, {
                  type: "brand-logo",
                  brand: (values.name as string) || (values.slug as string),
                })
              }
              onChange={(url) => onChange({ logoURL: url })}
            />
          ),
        },
      }),
    [upload],
  );

  const nav = useSectionFormNav(sections, form, { scope: "admin:brand-editor" });
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(brandFormSchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });

  const saveMutation = useApiMutation({
    errorMessage: "Failed to save brand.",
    mutationFn: async () => {
      const payload: BrandPayload = {
        name: form.name,
        // Create-only: an existing brand keeps the slug its links resolve on.
        slug: isEdit ? form.slug : toBrandSlug(form.name),
        description: form.description || undefined,
        logoURL: form.logoURL || undefined,
        website: form.website || undefined,
        country: form.country || undefined,
        founded: optionalNumber(form.founded),
        isActive: form.isActive,
        displayOrder: optionalNumber(form.displayOrder),
      };
      if (isEdit) return apiClient.put(ADMIN_ENDPOINTS.BRAND_BY_ID(brandId!), payload);
      return apiClient.post(ADMIN_ENDPOINTS.BRANDS, payload);
    },
    onSuccess: (res: JsonValue) => {
      const id =
        (res as { data?: { id?: string } })?.data?.id ?? (res as { id?: string })?.id ?? brandId;
      showToast(isEdit ? "Brand updated." : "Brand created.", "success");
      if (onSaved && id) onSaved(id);
    },
  });

  const deleteMutation = useApiMutation({
    errorMessage: "Failed to delete brand.",
    mutationFn: () => apiClient.delete(ADMIN_ENDPOINTS.BRAND_BY_ID(brandId!)),
    onSuccess: () => {
      showToast("Brand deleted.", "success");
      if (onDeleted) onDeleted();
    },
  });

  const onSubmit = () => {
    clearErrors();
    const parsed = brandFormSchema.safeParse({
      ...form,
      slug: isEdit ? form.slug : toBrandSlug(form.name),
      founded: optionalNumber(form.founded),
      displayOrder: optionalNumber(form.displayOrder),
    });
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues, setFieldError);
      return;
    }
    saveMutation.mutate();
  };

  // The live slug preview tracks the name until the brand exists.
  React.useEffect(() => {
    if (isEdit) return;
    setForm((prev) => ({ ...prev, slug: prev.name ? toBrandSlug(prev.name) : "" }));
  }, [form.name, isEdit]);

  const formSection = (
    <>
      <FormShellContext.Provider value={shellCtx}>
        <FormErrorSummary />
        <SectionForm<Values>
          sections={sections}
          values={form}
          onChange={(partial) => setForm((prev) => Object.assign({}, prev, partial))}
          onSubmit={onSubmit}
          schema={brandFormSchema}
          openIds={nav.openIds}
          onOpenChange={nav.setOpenIds}
          isLoading={saveMutation.isPending || brandQuery.isLoading}
          submitLabel={isEdit ? "Save changes" : "Create brand"}
          destructiveAction={
            isEdit
              ? { label: "Delete brand", onClick: () => setDeleteConfirmOpen(true) }
              : undefined
          }
        />
      </FormShellContext.Provider>
      {deleteConfirmOpen && (
        <ConfirmDeleteModal
          isOpen
          title="Delete Brand"
          message="Delete this brand? This cannot be undone."
          onConfirm={() => {
            deleteMutation.mutate();
            setDeleteConfirmOpen(false);
          }}
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
      title={isEdit ? "Edit Brand" : "Create Brand"}
      sections={[formSection]}
    />
  );
}
