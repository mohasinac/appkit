"use client";

/**
 * AdminAddressEditorView — on the shared address shape, 2026-08-30 (W5 / D19).
 *
 * ## What it was
 *
 * `adminAddressFormSchema`, a twelfth restatement of the same eleven fields,
 * with `postalCode: /^\d{6}$/` — India-only, on a form whose `country` was a
 * free-text box. It was the ONLY one of the three address surfaces that used
 * `INDIAN_STATES`; the other two shipped free text into the same
 * `AddressDocument.state`, so the field held "Karnataka", "karnataka" and "KA"
 * depending on which surface created the row.
 *
 * ## `canSave` is gone, and its last clause is why
 *
 * `form.postalCode.length === 6` — a LENGTH check, so `"abcdef"` satisfied it,
 * and any non-Indian address could never be saved from this screen at all.
 * The schema now decides, per country, and reports on the field.
 */

import { useApiMutation, type JsonValue } from "@mohasinac/appkit/client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ConfirmDeleteModal,
  Stack,
  StackedViewShell,
  useToast,
} from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { FieldInput, FormErrorSummary } from "../../../ui/forms";
import { FormShellContext, useFormShellState } from "../../../ui/forms/FormShell";
import { applyZodIssues } from "../../../ui/forms/apply-zod-issues";
import { buildSectionsFromSchema, visibleValues } from "../../shell/build-sections";
import { SectionForm, useSectionFormNav } from "../../shell/SectionForm";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import type { AddressOwnerType } from "../../addresses/schemas";
import { adminAddressCreateSchema } from "../../addresses/schemas/address-form";
import { AddressLocationFields } from "../../addresses/components/AddressLocationFields";
import { usePostalLookup } from "../../addresses/hooks/usePostalLookup";
import { COUNTRIES, DEFAULT_COUNTRY } from "../../../constants/geo/countries";

const COUNTRY_OPTIONS = Object.values(COUNTRIES).map((c) => ({
  value: c.code,
  label: c.name,
}));

const OWNER_TYPE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "store", label: "Store" },
];

export interface AdminAddressEditorViewProps
  extends Omit<StackedViewShellProps, "sections"> {
  addressId?: string;
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
}

/** The draft — the shared shape plus the owner only an admin may choose. */
interface AddressValues {
  [key: string]: unknown;
  ownerType: AddressOwnerType;
  ownerId: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

const EMPTY: AddressValues = {
  ownerType: "user",
  ownerId: "",
  label: "",
  fullName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  landmark: "",
  city: "",
  state: "",
  postalCode: "",
  country: DEFAULT_COUNTRY,
  isDefault: false,
};

export function AdminAddressEditorView({
  addressId,
  onSaved,
  onDeleted,
  ...rest
}: AdminAddressEditorViewProps) {
  const isEdit = Boolean(addressId);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const { showToast } = useToast();

  const [form, setForm] = React.useState<AddressValues>(EMPTY);
  const patch = (partial: Partial<AddressValues>) =>
    setForm((prev) => Object.assign({}, prev, partial));

  const { isLoading } = useQuery({
    queryKey: ["admin", "address", addressId],
    queryFn: async () => {
      const res = await apiClient.get(ADMIN_ENDPOINTS.ADDRESS_BY_ID(addressId!));
      return ((res as { data?: Partial<AddressValues> })?.data ??
        res) as Partial<AddressValues>;
    },
    enabled: isEdit,
    select: (data) => {
      patch({ ...EMPTY, ...data, country: data.country || DEFAULT_COUNTRY });
      return data;
    },
  });

  const { lookup, isLooking } = usePostalLookup({
    // Empty fields only — never correct what the admin typed.
    onResolved: ({ city, state }) =>
      setForm((prev) => ({
        ...prev,
        city: prev.city.trim() ? prev.city : city,
        state: prev.state.trim() ? prev.state : state,
      })),
  });

  const saveMutation = useApiMutation({
    errorMessage: "Failed to save address.",
    mutationFn: async () => {
      const draft = visibleValues(adminAddressCreateSchema, form) as AddressValues;
      const payload = {
        ...draft,
        addressLine2: draft.addressLine2 || undefined,
        landmark: draft.landmark || undefined,
      };
      if (isEdit) {
        return apiClient.patch(ADMIN_ENDPOINTS.ADDRESS_BY_ID(addressId!), payload);
      }
      return apiClient.post(ADMIN_ENDPOINTS.ADDRESSES, payload);
    },
    onSuccess: (res: JsonValue) => {
      const created = (res as { data?: { id?: string } })?.data?.id;
      const id = addressId ?? created;
      showToast(isEdit ? "Address updated." : "Address created.", "success");
      if (onSaved && id) onSaved(String(id));
    },
  });

  const deleteMutation = useApiMutation({
    errorMessage: "Failed to delete address.",
    mutationFn: () => apiClient.delete(ADMIN_ENDPOINTS.ADDRESS_BY_ID(addressId!)),
    onSuccess: () => {
      showToast("Address deleted.", "success");
      setDeleteOpen(false);
      if (onDeleted) onDeleted();
    },
  });

  const isSubmitting = saveMutation.isPending || isLoading;

  const sections = React.useMemo(
    () =>
      buildSectionsFromSchema<AddressValues>(adminAddressCreateSchema, {
        options: { ownerType: OWNER_TYPE_OPTIONS, country: COUNTRY_OPTIONS },
        renderers: {
          /*
           * The id's LABEL depends on the owner type, which a generated field
           * cannot know — and switching type clears it, because a user slug is
           * not a store slug and carrying it over produces an address attached
           * to nothing.
           */
          ownerId: ({ values, onChange, errors }) => (
            <FieldInput
              name="ownerId"
              required
              label={values.ownerType === "user" ? "User ID" : "Store ID (slug)"}
              hint={
                values.ownerType === "user"
                  ? "Firebase Auth UID or user slug"
                  : "Store slug, e.g. store-beyblade-arena"
              }
              placeholder={
                values.ownerType === "user" ? "user-mohsin-c" : "store-beyblade-arena"
              }
              value={values.ownerId}
              error={errors.ownerId}
              onChange={(v) => onChange({ ownerId: v })}
            />
          ),
          state: ({ values, onChange, errors }) => (
            <AddressLocationFields
              country={values.country}
              state={values.state}
              postalCode={values.postalCode}
              errors={errors}
              isLooking={isLooking}
              onChange={onChange}
              onPostalSettled={lookup}
            />
          ),
          postalCode: () => null,
          country: () => null,
        },
      }),
    [isLooking, lookup],
  );

  const nav = useSectionFormNav(sections, form, { scope: "admin:address-editor" });
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(
    adminAddressCreateSchema,
    {
      sections: nav.sectionMeta,
      onGoToSection: nav.goToSection,
      fieldToSectionIndex: nav.fieldToSectionIndex,
    },
  );

  const handleSubmit = () => {
    clearErrors();
    const parsed = adminAddressCreateSchema.safeParse(
      visibleValues(adminAddressCreateSchema, form),
    );
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues, setFieldError);
      return;
    }
    saveMutation.mutate();
  };

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={isEdit ? "Edit address" : "New address"}
      sections={[
        <Stack gap="md" key="address-form">
          <FormShellContext.Provider value={shellCtx}>
            <FormErrorSummary />
            <SectionForm<AddressValues>
              sections={sections}
              values={form}
              onChange={patch}
              onSubmit={handleSubmit}
              schema={adminAddressCreateSchema}
              openIds={nav.openIds}
              onOpenChange={nav.setOpenIds}
              isLoading={isSubmitting}
              submitLabel={
                isEdit ? ACTIONS.ADMIN["save-changes"].label : "Create address"
              }
              destructiveAction={
                isEdit
                  ? {
                      label: "Delete address",
                      onClick: () => setDeleteOpen(true),
                      disabled: deleteMutation.isPending,
                    }
                  : undefined
              }
            />
          </FormShellContext.Provider>
          {deleteOpen && (
            <ConfirmDeleteModal
              isOpen
              title="Delete this address?"
              message="This removes the address permanently. Orders already shipped to it keep their own copy."
              onConfirm={() => deleteMutation.mutate()}
              onClose={() => setDeleteOpen(false)}
              isDeleting={deleteMutation.isPending}
            />
          )}
        </Stack>,
      ]}
    />
  );
}
