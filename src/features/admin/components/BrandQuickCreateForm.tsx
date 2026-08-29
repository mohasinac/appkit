"use client";

/**
 * The "+ Create Brand" drawer behind every brand `PaginatedSelect`.
 *
 * Fields come from `quickCreateTaxonomySchema`'s annotations — the same schema
 * `CategoryQuickCreateForm` derives from, since both drawers post
 * `{ name, description, isActive }` and differ only in endpoint and slug prefix.
 *
 * `slug` is deliberately not a field: it is derived from the name here and
 * treated as create-only everywhere else in this codebase (Root Cause #39).
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

export interface BrandQuickCreateFormProps {
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

function toBrandSlug(str: string): string {
  const base = str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.startsWith("brand-") ? base : `brand-${base}`;
}

export function BrandQuickCreateForm({ onSaved, onCancel }: BrandQuickCreateFormProps) {
  const [form, setForm] = React.useState<Values>(EMPTY);

  const sections = React.useMemo(() => buildSectionsFromSchema<Values>(quickCreateTaxonomySchema), []);
  const nav = useSectionFormNav(sections, form, { scope: "admin:brand-quick-create" });
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(quickCreateTaxonomySchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });

  const mutation = useApiMutation({
    // Authored copy goes here, never a toast in `onError` — the mutation
    // already owns exactly one failure surface (audit-usemutation-onerror).
    errorMessage: "Failed to create brand.",
    mutationFn: async () =>
      apiClient.post(ADMIN_ENDPOINTS.BRANDS, {
        name: form.name,
        slug: toBrandSlug(form.name),
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
        submitLabel="Create brand"
        onCancel={onCancel}
        cancelLabel="Cancel"
      />
    </FormShellContext.Provider>
  );
}
