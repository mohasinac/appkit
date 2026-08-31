"use client";

import { Code, useApiMutation } from "@mohasinac/appkit/client";
import type { JsonValue } from "@mohasinac/appkit/client";
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, Button, ConfirmDeleteModal, Div, Form, FormActions, Heading, Input, Row, Select, SideDrawer, Span, Stack, StackedViewShell, Text, Textarea, Toggle, useToast } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import {
  adminUserUpdateSchema,
  toPublicProfilePayload,
  type AdminUserUpdateValues,
} from "../schemas/admin-user-form";
import {
  SectionForm,
  useSectionFormNav,
  buildSectionsFromSchema,
  visibleValues,
} from "../../shell";
import { useFormShellState, FormShellContext } from "../../../ui/forms";
import { applyZodIssues } from "../../../ui/forms/apply-zod-issues";
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";

// --- Types -------------------------------------------------------------------

interface SoftBanEntry {
  action: string;
  reason: string;
  bannedAt: string;
  expiresAt?: string | null;
  bannedBy: string;
}

export interface AdminUserEditorViewProps {
  open: boolean;
  onClose: () => void;
  userId?: string;
  displayName?: string;
  photoURL?: string | null;
  currentRole?: string;
  currentEmailVerified?: boolean;
  /** Tester program flag — orthogonal to role. Grants access to the Tester Hub and auto-approves the user's store. */
  currentIsTester?: boolean;
  /** Orthogonal to isTester — grants real /admin/** RBAC access + admin-only checklist items. Meaningless unless currentIsTester is also true. */
  currentCanTestAdmin?: boolean;
  /** Store the user owns (for sellers/admins). storeId === storeSlug in this project. */
  ownedStoreId?: string;
  ownedStoreName?: string;
  /** Soft bans from the user document (serialized from Firestore). */
  currentSoftBans?: SoftBanEntry[];
  /** Whether the user is hard-banned (isDisabled + hardBanReason set). */
  currentIsHardBanned?: boolean;
  currentHardBanReason?: string;
  // ST-2 — extended profile fields the admin can edit on the user's behalf
  currentPhoneNumber?: string | null;
  currentBio?: string;
  currentLocation?: string;
  currentWebsite?: string;
  currentSocialLinks?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    linkedin?: string;
  };
}

const ROLE_OPTIONS = [
  { label: "User (buyer)", value: "user" },
  { label: "Seller", value: "seller" },
  { label: "Admin", value: "admin" },
];

const BANNED_ACTION_OPTIONS = [
  { label: "Write reviews", value: "write_reviews" },
  { label: "Write blog comments", value: "write_blog_comments" },
  { label: "Join events", value: "join_events" },
  { label: "Place bids", value: "place_bids" },
  { label: "Create listings", value: "create_listings" },
  { label: "Send messages", value: "send_messages" },
  { label: "Create support tickets", value: "create_support_tickets" },
  { label: "Report scammers", value: "report_scammers" },
];

function formatBanAction(action: string): string {
  return BANNED_ACTION_OPTIONS.find((o) => o.value === action)?.label ?? action;
}

function formatExpiry(expiresAt?: string | null): string {
  if (!expiresAt) return "Permanent";
  const d = new Date(expiresAt);
  if (isNaN(d.getTime())) return "Permanent";
  if (d < new Date()) return `Expired ${d.toLocaleDateString()}`;
  return `Until ${d.toLocaleDateString()}`;
}

// --- Sub-components ----------------------------------------------------------

interface HardBanPanelProps {
  userId?: string;
  isHardBanned: boolean;
  currentHardBanReason?: string;
  showHardBanForm: boolean;
  setShowHardBanForm: (v: boolean) => void;
  hardBanReasonInput: string;
  setHardBanReasonInput: (v: string) => void;
  hardBanPending: boolean;
  unbanPending: boolean;
  onHardBan: (reason: string) => void;
  onUnban: () => void;
}

function HardBanPanel({
  userId, isHardBanned, currentHardBanReason,
  showHardBanForm, setShowHardBanForm, hardBanReasonInput, setHardBanReasonInput,
  hardBanPending, unbanPending, onHardBan, onUnban,
}: HardBanPanelProps) {
  return (
    <Div surface="muted" padding="sm" rounded="lg" border="default" className="mb-4">
      <Row justify="between" gap="sm" className="mb-2">
        <Span size="sm" weight="medium" color="muted">Hard ban</Span>
        {isHardBanned ? (
          <Span color="error" surface="danger-surface" size="xs" weight="semibold" rounded="full" padding="pill-xs">Banned</Span>
        ) : (
          <Span color="success" surface="success-surface" size="xs" weight="semibold" rounded="full" padding="pill-xs">Active</Span>
        )}
      </Row>
      {isHardBanned ? (
        <Stack gap="xs">
          {currentHardBanReason && <Text size="xs" color="muted">Reason: {currentHardBanReason}</Text>}
          <Button type="button" variant="secondary" size="sm" isLoading={unbanPending} disabled={unbanPending} onClick={onUnban}>Lift hard ban</Button>
        </Stack>
      ) : showHardBanForm ? (
        <Stack gap="xs">
          <Textarea
            label="Ban reason (required)"
            value={hardBanReasonInput}
            onChange={(e) => setHardBanReasonInput(e.target.value)}
            rows={2}
            placeholder="e.g. Repeated fraud, scam activity…"
            variant="error"
          />
          <Row gap="xs">
            <Button type="button" variant="danger" size="sm" isLoading={hardBanPending} disabled={!hardBanReasonInput.trim() || hardBanPending} onClick={() => onHardBan(hardBanReasonInput.trim())}>Confirm hard ban</Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => { setShowHardBanForm(false); setHardBanReasonInput(""); }}>Cancel</Button>
          </Row>
        </Stack>
      ) : (
        <Button type="button" variant="danger" size="sm" disabled={!userId} onClick={() => setShowHardBanForm(true)}>Impose hard ban</Button>
      )}
    </Div>
  );
}

interface SoftBanPanelProps {
  userId?: string;
  softBans: SoftBanEntry[];
  showAddSoftBan: boolean;
  setShowAddSoftBan: (v: boolean) => void;
  softBanAction: string;
  setSoftBanAction: (v: string) => void;
  softBanReason: string;
  setSoftBanReason: (v: string) => void;
  softBanExpiry: string;
  setSoftBanExpiry: (v: string) => void;
  softBanPending: boolean;
  liftPending: boolean;
  onAddSoftBan: (payload: { action: string; reason: string; expiresAt?: string }) => void;
  onLiftSoftBan: (action: string) => void;
}

function SoftBanPanel({
  userId, softBans, showAddSoftBan, setShowAddSoftBan,
  softBanAction, setSoftBanAction, softBanReason, setSoftBanReason,
  softBanExpiry, setSoftBanExpiry, softBanPending, liftPending,
  onAddSoftBan, onLiftSoftBan,
}: SoftBanPanelProps) {
  return (
    <Div surface="muted" padding="sm" rounded="lg" border="default">
      <Row justify="between" gap="sm" className="mb-2">
        <Span size="sm" weight="medium" color="muted">Soft bans{softBans.length > 0 ? ` (${softBans.length})` : ""}</Span>
        {!showAddSoftBan && (
          <Button type="button" variant="secondary" size="sm" disabled={!userId} onClick={() => setShowAddSoftBan(true)}>Add soft ban</Button>
        )}
      </Row>
      {softBans.length > 0 && (
        <Stack as="ul" gap="xs" className="mb-3">
          {softBans.map((ban) => (
            <Row
              as="li"
              key={ban.action}
              align="start"
              justify="between"
              gap="xs"
              surface="default"
              padding="inlineSm"
              rounded="md"
              border="default"
            >
              <Stack gap="none" className="min-w-0 flex-1">
                <Span size="xs" weight="semibold">{formatBanAction(ban.action)}</Span>
                <Span size="xs" color="muted">{ban.reason}</Span>
                <Span size="xs" color="muted">{formatExpiry(ban.expiresAt)}</Span>
              </Stack>
              <Button type="button" variant="secondary" size="sm" isLoading={liftPending} disabled={liftPending} onClick={() => onLiftSoftBan(ban.action)}>Lift</Button>
            </Row>
          ))}
        </Stack>
      )}
      {showAddSoftBan && (
        <Stack gap="xs">
          <Select label="Action to restrict" options={BANNED_ACTION_OPTIONS} value={softBanAction} onValueChange={setSoftBanAction} />
          <Textarea
            label="Reason (required)"
            value={softBanReason}
            onChange={(e) => setSoftBanReason(e.target.value)}
            rows={2}
            placeholder="e.g. Suspicious bid activity…"
          />
          <Input
            label="Expires at (optional — leave blank for permanent)"
            type="datetime-local"
            value={softBanExpiry}
            onChange={(e) => setSoftBanExpiry(e.target.value)}
          />
          <Row gap="xs">
            <Button type="button" variant="primary" size="sm" isLoading={softBanPending} disabled={!softBanReason.trim() || softBanPending}
              onClick={() => onAddSoftBan({ action: softBanAction, reason: softBanReason.trim(), ...(softBanExpiry ? { expiresAt: new Date(softBanExpiry).toISOString() } : {}) })}>
              Apply soft ban
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => { setShowAddSoftBan(false); setSoftBanReason(""); setSoftBanExpiry(""); }}>Cancel</Button>
          </Row>
        </Stack>
      )}
      {softBans.length === 0 && !showAddSoftBan && (
        <Text size="xs" color="muted">No active soft bans.</Text>
      )}
    </Div>
  );
}

// --- Component ---------------------------------------------------------------

export function AdminUserEditorView({
  open,
  onClose,
  userId,
  displayName,
  photoURL,
  currentRole,
  currentEmailVerified,
  currentIsTester,
  currentCanTestAdmin,
  ownedStoreId,
  ownedStoreName,
  currentSoftBans,
  currentIsHardBanned,
  currentHardBanReason,
  currentPhoneNumber,
  currentBio,
  currentLocation,
  currentWebsite,
  currentSocialLinks,
}: AdminUserEditorViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // --- General fields -------------------------------------------------------
  const [draft, setDraft] = React.useState<AdminUserUpdateValues>({});
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  // --- ST-2 profile fields --------------------------------------------------

  // --- Hard ban form --------------------------------------------------------
  const [showHardBanForm, setShowHardBanForm] = React.useState(false);
  const [hardBanReasonInput, setHardBanReasonInput] = React.useState("");

  // --- Soft ban form --------------------------------------------------------
  const [showAddSoftBan, setShowAddSoftBan] = React.useState(false);
  const [softBanAction, setSoftBanAction] = React.useState(BANNED_ACTION_OPTIONS[0].value);
  const [softBanReason, setSoftBanReason] = React.useState("");
  const [softBanExpiry, setSoftBanExpiry] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setDraft({
        role: (currentRole ?? "user") as AdminUserUpdateValues["role"],
        emailVerified: currentEmailVerified ?? false,
        isTester: currentIsTester ?? false,
        canTestAdmin: currentCanTestAdmin ?? false,
        adminNotes: "",
        displayName: displayName ?? "",
        phoneNumber: currentPhoneNumber ?? "",
        bio: currentBio ?? "",
        location: currentLocation ?? "",
        website: currentWebsite ?? "",
        twitter: currentSocialLinks?.twitter ?? "",
        instagram: currentSocialLinks?.instagram ?? "",
        facebook: currentSocialLinks?.facebook ?? "",
        linkedin: currentSocialLinks?.linkedin ?? "",
      });
      setShowHardBanForm(false);
      setHardBanReasonInput("");
      setShowAddSoftBan(false);
      setSoftBanAction(BANNED_ACTION_OPTIONS[0].value);
      setSoftBanReason("");
      setSoftBanExpiry("");
    }
  }, [
    open,
    currentRole,
    currentEmailVerified,
    currentIsTester,
    currentCanTestAdmin,
    displayName,
    currentPhoneNumber,
    currentBio,
    currentLocation,
    currentWebsite,
    currentSocialLinks?.twitter,
    currentSocialLinks?.instagram,
    currentSocialLinks?.facebook,
    currentSocialLinks?.linkedin,
  ]);

  const sections = React.useMemo(
    () =>
      buildSectionsFromSchema<AdminUserUpdateValues>(adminUserUpdateSchema, {
        options: { role: ROLE_OPTIONS },
      }),
    [],
  );
  const nav = useSectionFormNav(sections, draft, { scope: "admin:user-editor" });
  const form = useFormShellState(adminUserUpdateSchema, {
    sections: nav.sectionMeta,
    onGoToSection: nav.goToSection,
    fieldToSectionIndex: nav.fieldToSectionIndex,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

  // --- Mutations ------------------------------------------------------------

  const saveMutation = useApiMutation({
    errorMessage: "Failed to update user.",
    mutationFn: async () => {
      const v = visibleValues(adminUserUpdateSchema, draft) as AdminUserUpdateValues;
      await apiClient.patch(ADMIN_ENDPOINTS.USER_BY_ID(userId!), {
        role: v.role,
        emailVerified: v.emailVerified,
        isTester: v.isTester,
        // `when` already drops this once `isTester` is off; the `?? false` is
        // what CLEARS a previously-granted flag rather than omitting the key.
        canTestAdmin: v.canTestAdmin ?? false,
        adminNotes: v.adminNotes || undefined,
        displayName: v.displayName?.trim() || undefined,
        phoneNumber: v.phoneNumber?.trim() || undefined,
        // ST-2 — a partial: only the subkeys that were filled in, so an
        // untouched field never overwrites what is stored.
        publicProfile: toPublicProfilePayload(v),
      });
    },
    onSuccess: () => {
      showToast("User updated.", "success");
      invalidate();
      onClose();
    },
  });

  const deleteMutation = useApiMutation({
    errorMessage: "Failed to delete user.",
    mutationFn: async () => {
      await apiClient.delete(ADMIN_ENDPOINTS.USER_BY_ID(userId!));
    },
    onSuccess: () => {
      showToast("User deleted.", "success");
      invalidate();
      setDeleteOpen(false);
      onClose();
    },
  });

  const hardBanMutation = useApiMutation({
    errorMessage: "Failed to ban user.",
    mutationFn: async (reason: string) => {
      await apiClient.post(ADMIN_ENDPOINTS.USER_HARD_BAN(userId!), { reason });
    },
    onSuccess: () => {
      showToast("User hard-banned.", "success");
      invalidate();
      setShowHardBanForm(false);
      setHardBanReasonInput("");
      onClose();
    },
  });

  const unbanMutation = useApiMutation({
    errorMessage: "Failed to unban user.",
    mutationFn: async () => {
      await apiClient.post(ADMIN_ENDPOINTS.USER_UNBAN(userId!), {});
    },
    onSuccess: () => {
      showToast("User unbanned.", "success");
      invalidate();
      onClose();
    },
  });

  const softBanMutation = useApiMutation({
    errorMessage: "Failed to apply soft ban.",
    mutationFn: async (payload: { action: string; reason: string; expiresAt?: string }) => {
      await apiClient.post(ADMIN_ENDPOINTS.USER_SOFT_BAN(userId!), payload);
    },
    onSuccess: () => {
      showToast("Soft ban applied.", "success");
      invalidate();
      setShowAddSoftBan(false);
      setSoftBanAction(BANNED_ACTION_OPTIONS[0].value);
      setSoftBanReason("");
      setSoftBanExpiry("");
    },
  });

  const liftSoftBanMutation = useApiMutation({
    errorMessage: "Failed to lift soft ban.",
    mutationFn: async (action: string) => {
      await apiClient.delete(ADMIN_ENDPOINTS.USER_SOFT_BAN_LIFT(userId!, action));
    },
    onSuccess: () => {
      showToast("Soft ban lifted.", "success");
      invalidate();
    },
  });

  const isHardBanned = currentIsHardBanned ?? false;
  const softBans = currentSoftBans ?? [];

  const renderAvatarHeader = () =>
    userId ? (
      <Row gap="sm" align="center">
        <Avatar src={photoURL ?? null} name={displayName ?? userId} size="md" />
        <Text size="sm" weight="semibold">{displayName ?? userId}</Text>
      </Row>
    ) : null;

  const renderInfoCard = () =>
    userId ? (
      <Div textSize="xs" surface="muted" rounded="lg" border="default" padding="inlineSm">
        <Stack color="primary" gap="xs">
          <Text size="xs">
            <Span weight="semibold">Owner ID (Firebase UID):</Span>{" "}
            <Code className="select-all font-mono">{userId}</Code>
          </Text>
          {ownedStoreId && (
            <Text size="xs">
              <Span weight="semibold">Owns store:</Span>{" "}
              <Code className="select-all font-mono">{ownedStoreId}</Code>
              {ownedStoreName ? ` — ${ownedStoreName}` : ""}
            </Text>
          )}
        </Stack>
      </Div>
    ) : null;

  const renderFieldsSection = () => (
    <SectionForm<AdminUserUpdateValues>
      sections={sections}
      values={draft}
      onChange={(partial) => setDraft((d) => ({ ...d, ...partial }))}
      onSubmit={() => {
        // SectionForm scrolls to the first erroring section and then submits
        // regardless, so the guard lives here.
        form.clearErrors();
        const parsed = adminUserUpdateSchema.safeParse(
          visibleValues(adminUserUpdateSchema, draft),
        );
        if (!parsed.success) {
          applyZodIssues(parsed.error.issues, form.setFieldError);
          return;
        }
        saveMutation.mutate();
      }}
      onValidationChange={() => form.validate(draft)}
      schema={adminUserUpdateSchema}
      openIds={nav.openIds}
      onOpenChange={nav.setOpenIds}
      submitLabel="Save changes"
      cancelLabel="Cancel"
      onCancel={onClose}
      isLoading={saveMutation.isPending}
      destructiveAction={{
        label: "Delete user",
        onClick: () => setDeleteOpen(true),
        disabled: !userId,
      }}
    />
  );

  const renderModerationSection = () => (
    <Stack border="default" as="section" gap="sm" className="border-t" padding="t-md">
      <Heading level={3} className="mb-3" color="muted" size="sm" weight="semibold">
        Moderation
      </Heading>

      <HardBanPanel
        userId={userId}
        isHardBanned={isHardBanned}
        currentHardBanReason={currentHardBanReason}
        showHardBanForm={showHardBanForm}
        setShowHardBanForm={setShowHardBanForm}
        hardBanReasonInput={hardBanReasonInput}
        setHardBanReasonInput={setHardBanReasonInput}
        hardBanPending={hardBanMutation.isPending}
        unbanPending={unbanMutation.isPending}
        onHardBan={(reason) => hardBanMutation.mutate(reason)}
        onUnban={() => unbanMutation.mutate()}
      />
      <SoftBanPanel
        userId={userId}
        softBans={softBans}
        showAddSoftBan={showAddSoftBan}
        setShowAddSoftBan={setShowAddSoftBan}
        softBanAction={softBanAction}
        setSoftBanAction={setSoftBanAction}
        softBanReason={softBanReason}
        setSoftBanReason={setSoftBanReason}
        softBanExpiry={softBanExpiry}
        setSoftBanExpiry={setSoftBanExpiry}
        softBanPending={softBanMutation.isPending}
        liftPending={liftSoftBanMutation.isPending}
        onAddSoftBan={(payload) => softBanMutation.mutate(payload)}
        onLiftSoftBan={(action) => liftSoftBanMutation.mutate(action)}
      />
    </Stack>
  );

  return (
    <>
      <SideDrawer
        isOpen={open}
        onClose={onClose}
        title={displayName ? `Manage: ${displayName}` : "Manage User"}
      >
        <FormShellContext.Provider value={form.shellCtx}>
          <Div padding="md">
          <FormErrorSummary />
          <StackedViewShell
            portal="admin"
            className="space-y-4"
            sections={[
              renderAvatarHeader,
              renderInfoCard,
              renderFieldsSection,
              renderModerationSection,
            ]}
          />
          </Div>
        </FormShellContext.Provider>
      </SideDrawer>

      <ConfirmDeleteModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        isDeleting={deleteMutation.isPending}
        title={`Delete ${displayName ?? "user"}?`}
        message="This action cannot be undone. The user's account and all associated data will be permanently removed."
        confirmText="Delete user"
        variant="danger"
      />
    </>
  );
}
