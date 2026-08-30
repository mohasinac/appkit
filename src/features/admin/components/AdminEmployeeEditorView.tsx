"use client";

import { useApiMutation } from "@mohasinac/appkit/client";
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Checkbox, ConfirmDeleteModal, Details, Div, PaginatedSelect, SideDrawer, Span, Stack, Summary, Text, useToast } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  PERMISSION_GROUPS,
  PERMISSION_DOMAINS,
  getPermissionsForDomain,
  formatPermLabel,
  type EmployeeGroup,
} from "../../auth/permissions/constants";
import {
  employeeInviteSchema,
  employeePermissionsSchema,
} from "../schemas/admin-ops-forms";
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";
import { FormShellContext, useFormShellState } from "../../../ui/forms/FormShell";
import { applyZodIssues } from "../../../ui/forms/apply-zod-issues";
import { buildSectionsFromSchema, visibleValues } from "../../shell/build-sections";
import { SectionForm, useSectionFormNav } from "../../shell/SectionForm";

const __O = {
  yAuto: "overflow-y-auto",
} as const;

// --- Types -------------------------------------------------------------------

export interface AdminEmployeeEditorViewProps {
  open: boolean;
  onClose: () => void;
  mode: "invite" | "edit";
  userId?: string;
  displayName?: string;
  currentPermissionGroup?: string;
  currentPermissions?: string[];
}

// --- Helpers -----------------------------------------------------------------

/** Two acronyms the generic humaniser would render as "Seo" / "Qa". */
const GROUP_LABEL_OVERRIDES: Record<string, string> = {
  seo_manager: "SEO Manager",
  trust_and_safety: "Trust & Safety",
};

/**
 * Permission groups, DERIVED from the presets rather than restated.
 *
 * The hand-written array this replaces listed eighteen of the nineteen —
 * `maintenance_employee` was simply absent, so that preset could never be
 * assigned from this drawer even though `PERMISSION_GROUPS` defines it and the
 * route accepts it. Root Cause #61, on the permission-group axis.
 *
 * Nineteen options is well over the five-option threshold, so the generator
 * renders it as a `PaginatedSelect`: it was a native `<Select>` with no
 * `name`, which is both unsearchable and unreachable by `applyZodIssues`.
 */
const GROUP_OPTIONS: { label: string; value: string }[] = [
  ...Object.keys(PERMISSION_GROUPS).map((value) => ({
    value,
    label:
      GROUP_LABEL_OVERRIDES[value] ??
      value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  })),
  { label: "Custom", value: "custom" },
];

/**
 * The permission-group picker.
 *
 * Its own component because choosing a group is not a plain field write — it
 * replaces the permission set with that group's preset, which the generator's
 * default `onChange` cannot know about. Module level rather than inline for
 * the DEEP_NESTING reason.
 */
function FieldSelectGroup({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string;
  onChange: (next: string) => void;
}) {
  return (
    <Stack gap="xs">
      <Text size="sm" weight="medium" color="muted">
        Permission group *
      </Text>
      <PaginatedSelect<string>
        value={value}
        options={GROUP_OPTIONS}
        onChange={(next) => onChange(next ?? "custom")}
        placeholder="Choose a permission group…"
        searchPlaceholder="Search groups…"
        ariaLabel="Permission group"
      />
      <Text size="xs" color="muted">
        Selecting a group auto-fills the permissions below. You can still
        customise individual permissions.
      </Text>
      {error && (
        <Text size="xs" color="error" role="alert">
          {error}
        </Text>
      )}
    </Stack>
  );
}

/** The draft this form edits — flat, matching the schema's shape. */
interface EmployeeValues {
  [key: string]: unknown;
  email: string;
  permissionGroup: string;
  permissions: string[];
}

interface PermissionDomainsPanelProps {
  permissions: string[];
  togglePerm: (perm: string) => void;
}

/**
 * The permission matrix.
 *
 * An array rather than a `Set` now: it is a schema field, and a `Set` is not
 * JSON — it would serialise to `{}` at any payload boundary that forgot to
 * convert it, which the two mutations previously did by hand.
 */
function PermissionDomainsPanel({ permissions, togglePerm }: PermissionDomainsPanelProps) {
  const selected = new Set(permissions);
  return (
    <Stack gap="sm">
      <Span size="sm" weight="medium" color="muted">
        Permissions
        <Span size="xs" weight="normal" className="ml-2" color="muted">
          ({selected.size} selected)
        </Span>
      </Span>
      <Div className={`divide-y divide-zinc-100 divide-[var(--appkit-color-border)] max-h-[42vh] ${__O.yAuto}`} rounded="xl" border="default">
        {PERMISSION_DOMAINS.map((domain) => {
          const domainPerms = getPermissionsForDomain(domain.prefix);
          if (domainPerms.length === 0) return null;
          const checked = domainPerms.filter((p) => selected.has(p)).length;
          return (
            <Details key={domain.prefix} className="group">
              <Summary paddingX="x-sm" paddingY="y-xs" weight="semibold" color="muted" layout="flex" align="center" justify="between" className="uppercase tracking-wide hover:bg-[var(--appkit-color-bg)] transition-colors">
                <Span size="xs">{domain.label}</Span>
                <Span size="xs" weight="normal" className="normal-case" color="faint">
                  {checked}/{domainPerms.length}
                </Span>
              </Summary>
              <Div layout="grid" paddingY="y-xs-tall" className="grid-cols-2 gap-x-2 gap-y-1.5" surface="muted" padding="x-sm">
                {domainPerms.map((perm) => (
                  <label
                    key={perm}
                    className="flex items-center gap-[var(--appkit-space-2)] cursor-pointer text-[length:var(--appkit-text-xs)] text-[var(--appkit-color-text-muted)]"
                  >
                    <Checkbox
                      bare
                      checked={selected.has(perm)}
                      onChange={() => togglePerm(perm)}
                      className="h-3.5 w-3.5 rounded border-[var(--appkit-color-border)] accent-primary"
                    />
                    {formatPermLabel(perm)}
                  </label>
                ))}
              </Div>
            </Details>
          );
        })}
      </Div>
    </Stack>
  );
}

// --- Component ---------------------------------------------------------------

export function AdminEmployeeEditorView({
  open,
  onClose,
  mode,
  userId,
  displayName,
  currentPermissionGroup,
  currentPermissions = [],
}: AdminEmployeeEditorViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [form, setForm] = React.useState<EmployeeValues>({
    email: "",
    permissionGroup: currentPermissionGroup ?? "custom",
    permissions: currentPermissions,
  });
  const [revokeOpen, setRevokeOpen] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setForm({
        email: "",
        permissionGroup: currentPermissionGroup ?? "custom",
        permissions: currentPermissions,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentPermissionGroup]);

  /**
   * Choosing a group replaces the permission set with its preset; "Custom"
   * leaves whatever is ticked alone, which is what makes it custom.
   */
  const applyGroupPreset = (newGroup: string) =>
    setForm((prev) => ({
      ...prev,
      permissionGroup: newGroup,
      permissions:
        newGroup === "custom"
          ? prev.permissions
          : [...(PERMISSION_GROUPS[newGroup as Exclude<EmployeeGroup, "custom">] ?? [])],
    }));

  const togglePerm = (perm: string) =>
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));

  const inviteMutation = useApiMutation({
    errorMessage: "Failed to invite employee",
    mutationFn: async () => {
      await apiClient.post(ADMIN_ENDPOINTS.TEAM, {
        email: form.email.trim(),
        permissionGroup: form.permissionGroup,
        permissions: form.permissions,
      });
    },
    onSuccess: () => {
      showToast("Employee invited successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "team"] });
      onClose();
    },
  });

  const updateMutation = useApiMutation({
    errorMessage: "Failed to update permissions",
    mutationFn: async () => {
      await apiClient.put(ADMIN_ENDPOINTS.TEAM_MEMBER(userId!), {
        permissionGroup: form.permissionGroup,
        permissions: form.permissions,
      });
    },
    onSuccess: () => {
      showToast("Permissions updated", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "team"] });
      onClose();
    },
  });

  const revokeMutation = useApiMutation({
    errorMessage: "Failed to revoke access",
    mutationFn: async () => {
      await apiClient.delete(ADMIN_ENDPOINTS.TEAM_MEMBER(userId!));
    },
    onSuccess: () => {
      showToast("Employee access revoked", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "team"] });
      setRevokeOpen(false);
      onClose();
    },
  });

  const isBusy =
    inviteMutation.isPending ||
    updateMutation.isPending ||
    revokeMutation.isPending;

  /*
   * Two schemas, one derived from the other by omission.
   *
   * The email input renders only while inviting, and the full schema was
   * parsed regardless — so an edit could only ever have failed on a control
   * that was not on screen. Nothing noticed, because nothing parsed it.
   */
  const schema = mode === "invite" ? employeeInviteSchema : employeePermissionsSchema;

  const sections = React.useMemo(
    () =>
      buildSectionsFromSchema<EmployeeValues>(schema, {
        options: { permissionGroup: GROUP_OPTIONS },
        renderers: {
          /*
           * The generator's own `onChange` is deliberately unused: choosing a
           * group also replaces the permission set with its preset, which a
           * plain field write cannot do.
           */
          permissionGroup: ({ values, errors }) => (
            <FieldSelectGroup
              value={values.permissionGroup}
              error={errors.permissionGroup}
              onChange={applyGroupPreset}
            />
          ),
          permissions: ({ values }) => (
            <PermissionDomainsPanel
              permissions={values.permissions}
              togglePerm={togglePerm}
            />
          ),
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schema],
  );

  const nav = useSectionFormNav(sections, form, { scope: "admin:employee-editor" });
  const { shellCtx, setFieldError, clearErrors } = useFormShellState(schema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });

  const handleSubmit = () => {
    clearErrors();
    const parsed = schema.safeParse(visibleValues(schema, form));
    if (!parsed.success) {
      applyZodIssues(parsed.error.issues, setFieldError);
      return;
    }
    if (mode === "invite") inviteMutation.mutate();
    else updateMutation.mutate();
  };

  return (
    <>
      <SideDrawer
        isOpen={open}
        onClose={onClose}
        title={mode === "invite" ? "Invite Employee" : `Edit — ${displayName ?? "Employee"}`}
      >
        <Div padding="md">
          <FormShellContext.Provider value={shellCtx}>
            <FormErrorSummary />
            <SectionForm<EmployeeValues>
              sections={sections}
              values={form}
              onChange={(partial) => setForm((prev) => ({ ...prev, ...partial }))}
              onSubmit={handleSubmit}
              schema={schema}
              openIds={nav.openIds}
              onOpenChange={nav.setOpenIds}
              isLoading={isBusy}
              submitLabel={mode === "invite" ? "Send invite" : "Save"}
              onCancel={onClose}
              /* A drawer owns its own footer — see `useIsInsideOverlay`. */
              bottomBar={false}
              destructiveAction={
                mode === "edit" && userId
                  ? { label: "Revoke access", onClick: () => setRevokeOpen(true), disabled: isBusy }
                  : undefined
              }
            />
          </FormShellContext.Provider>
        </Div>
      </SideDrawer>

      {mode === "edit" && (
        <ConfirmDeleteModal
          isOpen={revokeOpen}
          onClose={() => setRevokeOpen(false)}
          onConfirm={() => revokeMutation.mutate()}
          isDeleting={revokeMutation.isPending}
          title="Revoke employee access?"
          message={`${displayName ?? "This employee"} will lose admin panel access immediately. Their user account remains active — only their role is reset to user.`}
          confirmText="Revoke Access"
          variant="danger"
        />
      )}
    </>
  );
}
