"use client";

/**
 * The "+ Create Category" drawer behind every category `PaginatedSelect`.
 *
 * Twin of `BrandQuickCreateForm` and deliberately kept as two files: they share
 * a schema but differ in endpoint, slug prefix and copy, which is exactly two
 * copies with different domain semantics — the Duplication Decision Framework
 * says extract on the third, not the second.
 *
 * `slug` is not a field: derived from the name here, create-only everywhere
 * else in this codebase (Root Cause #39).
 */

import React from "react";

import { useApiMutation, type JsonValue } from "@mohasinac/appkit/client";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { apiClient } from "../../../http";
import { applyZodIssues } from "../../../ui/forms/apply-zod-issues";
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";
import { FormShellContext, useFormShellState } from "../../../ui/forms/FormShell";
import { buildSectionsFromSchema } from "../../shell/build-sections";
import { SectionForm, useSectionFormNav } from "../../shell/SectionForm";
import { quickCreateTaxonomySchema } from "../schemas/small-forms";

export interface CategoryQuickCreateFormProps {
  onSaved: (id: string, name: string) => void;
  onCancel: () => void;
}

interface Values {
  [key: string]: unknown;
  name: string;
  description: string;
  isActive: boolean;
}

const EMPTY: Values = { name: "", description: "", isActive: true };

function toCategorySlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CategoryQuickCreateForm({ onSaved, onCancel }: CategoryQuickCreateFormProps) {
  const [form, setForm] = React.useState<Values>(EMPTY);

  const sections = React.useMemo(() => buildSectionsFromSchema<Values>(quickCreateTaxonomySchema), []);
  const nav = useSectionFormNav(sections, form, { scope: "admin:category-quick-create" });
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(quickCreateTaxonomySchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });

  const mutation = useApiMutation({
    errorMessage: "Failed to create category.",
    mutationFn: async () =>
      apiClient.post(ADMIN_ENDPOINTS.CATEGORIES, {
        name: form.name,
        slug: toCategorySlug(form.name),
        description: form.description || undefined,
        isActive: form.isActive,
      }),
    onSuccess: (res: JsonValue) => {
      const id =
        (res as { data?: { id?: string } })?.data?.id ?? (res as { id?: string })?.id ?? "";
      onSaved(id as string, form.name);
    },
  });

  const onSubmit = () => {
    clearErrors();
    const parsed = quickCreateTaxonomySchema.safeParse(form);
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues, setFieldError);
      return;
    }
    mutation.mutate();
  };

  return (
    <FormShellContext.Provider value={shellCtx}>
      <FormErrorSummary />
      <SectionForm<Values>
        sections={sections}
        values={form}
        onChange={(partial) => setForm((prev) => Object.assign({}, prev, partial))}
        onSubmit={onSubmit}
        schema={quickCreateTaxonomySchema}
        openIds={nav.openIds}
        onOpenChange={nav.setOpenIds}
        isLoading={mutation.isPending}
        submitLabel="Create category"
        onCancel={onCancel}
        cancelLabel="Cancel"
      />
    </FormShellContext.Provider>
  );
}
