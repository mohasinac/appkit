"use client";

import { useApiMutation } from "@mohasinac/appkit/client";
import React from "react";

import { Div, SideDrawer, useToast } from "../../../ui";
import { FormShellContext, useFormShellState } from "../../../ui/forms/FormShell";
import { SectionForm, useSectionFormNav, buildSectionsFromSchema } from "../../shell";

/** Matches `navItemFormSchema`; the draft always holds a concrete value. */
interface NavItemFormValues {
  [key: string]: string | number | boolean;
  label: string;
  href: string;
  icon: string;
  order: number;
  parentId: string;
  isVisible: boolean;
}

const EMPTY_NAV_ITEM: NavItemFormValues = {
  label: "",
  href: "",
  icon: "",
  order: 0,
  parentId: "",
  isVisible: true,
};
import { FormErrorSummary, applyZodIssues } from "../../../ui/forms";
import { navItemFormSchema } from "../schemas/nav-item-form";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

// --- Types -------------------------------------------------------------------

export interface NavItemData {
  id?: string;
  label: string;
  href: string;
  icon?: string;
  order?: number;
  parentId?: string;
  isVisible?: boolean;
}

export interface AdminNavEditorViewProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  item?: NavItemData | null;
  parentOptions?: { label: string; value: string }[];
}

// --- Constants ---------------------------------------------------------------

const ICON_OPTIONS = [
  { label: "None", value: "" },
  { label: "Home", value: "home" },
  { label: "Package", value: "package" },
  { label: "Gavel", value: "gavel" },
  { label: "Clock", value: "clock" },
  { label: "Grid", value: "grid" },
  { label: "Store", value: "store" },
  { label: "Calendar", value: "calendar" },
  { label: "BookOpen", value: "book-open" },
  { label: "Star", value: "star" },
  { label: "Tag", value: "tag" },
  { label: "Link", value: "link" },
];

// --- Component ---------------------------------------------------------------

export function AdminNavEditorView({
  open,
  onClose,
  onSaved,
  item,
  parentOptions = [],
}: AdminNavEditorViewProps) {
  const isEdit = Boolean(item?.id);

  const [values, setValues] = React.useState<NavItemFormValues>(EMPTY_NAV_ITEM);

  const handleChange = React.useCallback((partial: Partial<NavItemFormValues>) => {
    setValues((prev) => Object.assign({}, prev, partial));
  }, []);

  React.useEffect(() => {
    if (open && item) {
      setValues({
        label: item.label ?? "",
        href: item.href ?? "",
        icon: item.icon ?? "",
        order: item.order ?? 0,
        parentId: item.parentId ?? "",
        isVisible: item.isVisible ?? true,
      });
    } else if (!open) {
      setValues(EMPTY_NAV_ITEM);
    }
  }, [open, item]);

  const { showToast } = useToast();

  const saveMutation = useApiMutation({
    errorMessage: "Failed to save nav item.",
    mutationFn: async () => {
      const payload = {
        label: values.label,
        href: values.href,
        icon: values.icon || undefined,
        order: values.order,
        parentId: values.parentId || undefined,
        isVisible: values.isVisible,
      };
      if (isEdit) {
        return apiClient.patch(ADMIN_ENDPOINTS.NAVIGATION_BY_ID(item!.id!), payload);
      }
      return apiClient.post(ADMIN_ENDPOINTS.NAVIGATION, payload);
    },
    onSuccess: () => {
      showToast(isEdit ? "Nav item updated." : "Nav item created.", "success");
      onSaved();
      onClose();
    },
  });

  const sections = React.useMemo(
    () =>
      buildSectionsFromSchema<NavItemFormValues>(navItemFormSchema, {
        options: {
          icon: ICON_OPTIONS,
          // Injected by the caller, so it cannot come from the schema.
          parentId: [{ label: "None (top-level)", value: "" }, ...parentOptions],
        },
      }),
    [parentOptions],
  );

  const nav = useSectionFormNav(sections, values);
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(navItemFormSchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });

  /*
   * The routes already validated a nav item; this form did not, so an invalid
   * href surfaced as a 400 banner after a round-trip instead of an error on the
   * field. Same schema both sides now — and since it actually runs, the
   * hand-rolled `canSave` that used to sit here is gone. It restated two of the
   * schema's rules, disagreed with it on the rest, and was not even wired to
   * the button's `disabled`.
   */
  const onSubmit = () => {
    clearErrors();
    const parsed = navItemFormSchema.safeParse({
      label: values.label,
      href: values.href,
      icon: values.icon || undefined,
      order: values.order,
      parentId: values.parentId || undefined,
      isVisible: values.isVisible,
    });
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues, setFieldError);
      return;
    }
    saveMutation.mutate();
  };

  return (
    <SideDrawer
      isOpen={open}
      onClose={onClose}
      title={isEdit ? "Edit Nav Item" : "New Nav Item"}
    >
      <FormShellContext.Provider value={shellCtx}>
        <Div padding="md">
          <FormErrorSummary />
          <SectionForm<NavItemFormValues>
            sections={sections}
            values={values}
            onChange={handleChange}
            onSubmit={onSubmit}
            schema={navItemFormSchema}
            openIds={nav.openIds}
            onOpenChange={nav.setOpenIds}
            isLoading={saveMutation.isPending}
            submitLabel={isEdit ? "Save changes" : "Create item"}
            onCancel={onClose}
            cancelLabel="Cancel"
          />
        </Div>
      </FormShellContext.Provider>
    </SideDrawer>
  );
}
