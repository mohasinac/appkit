"use client";

import { Code, useApiMutation } from "@mohasinac/appkit/client";
import type { JsonValue } from "@mohasinac/appkit";
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, ConfirmDeleteModal, Div, Form, FormActions, Heading, Input, Row, Select, SideDrawer, Span, Stack, StackedViewShell, Text, Textarea, Toggle, useToast } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";

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
  currentRole?: string;
  currentIsDisabled?: boolean;
  currentEmailVerified?: boolean;
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
  currentRole,
  currentIsDisabled,
  currentEmailVerified,
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
  const [role, setRole] = React.useState(currentRole ?? "user");
  const [emailVerified, setEmailVerified] = React.useState(currentEmailVerified ?? false);
  const [adminNotes, setAdminNotes] = React.useState("");
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  // --- ST-2 profile fields --------------------------------------------------
  const [editDisplayName, setEditDisplayName] = React.useState(displayName ?? "");
  const [phoneNumber, setPhoneNumber] = React.useState(currentPhoneNumber ?? "");
  const [bio, setBio] = React.useState(currentBio ?? "");
  const [location, setLocation] = React.useState(currentLocation ?? "");
  const [website, setWebsite] = React.useState(currentWebsite ?? "");
  const [twitter, setTwitter] = React.useState(currentSocialLinks?.twitter ?? "");
  const [instagram, setInstagram] = React.useState(currentSocialLinks?.instagram ?? "");
  const [facebook, setFacebook] = React.useState(currentSocialLinks?.facebook ?? "");
  const [linkedin, setLinkedin] = React.useState(currentSocialLinks?.linkedin ?? "");

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
      setRole(currentRole ?? "user");
      setEmailVerified(currentEmailVerified ?? false);
      setAdminNotes("");
      setEditDisplayName(displayName ?? "");
      setPhoneNumber(currentPhoneNumber ?? "");
      setBio(currentBio ?? "");
      setLocation(currentLocation ?? "");
      setWebsite(currentWebsite ?? "");
      setTwitter(currentSocialLinks?.twitter ?? "");
      setInstagram(currentSocialLinks?.instagram ?? "");
      setFacebook(currentSocialLinks?.facebook ?? "");
      setLinkedin(currentSocialLinks?.linkedin ?? "");
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

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

  // --- Mutations ------------------------------------------------------------

  const saveMutation = useApiMutation({
    mutationFn: async () => {
      // ST-2 — build publicProfile partial only when something changed; keeps
      // the PATCH payload minimal and avoids overwriting unrelated subkeys.
      const socialLinks: Record<string, string> = {};
      if (twitter.trim()) socialLinks.twitter = twitter.trim();
      if (instagram.trim()) socialLinks.instagram = instagram.trim();
      if (facebook.trim()) socialLinks.facebook = facebook.trim();
      if (linkedin.trim()) socialLinks.linkedin = linkedin.trim();
      const publicProfile: Record<string, JsonValue> = {};
      if (bio.trim()) publicProfile.bio = bio.trim();
      if (location.trim()) publicProfile.location = location.trim();
      if (website.trim()) publicProfile.website = website.trim();
      if (Object.keys(socialLinks).length > 0) publicProfile.socialLinks = socialLinks;

      await apiClient.patch(ADMIN_ENDPOINTS.USER_BY_ID(userId!), {
        role,
        emailVerified,
        adminNotes: adminNotes || undefined,
        displayName: editDisplayName.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        publicProfile:
          Object.keys(publicProfile).length > 0 ? publicProfile : undefined,
      });
    },
    onSuccess: () => {
      showToast("User updated.", "success");
      invalidate();
      onClose();
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to update user.", "error");
    },
  });

  const deleteMutation = useApiMutation({
    mutationFn: async () => {
      await apiClient.delete(ADMIN_ENDPOINTS.USER_BY_ID(userId!));
    },
    onSuccess: () => {
      showToast("User deleted.", "success");
      invalidate();
      setDeleteOpen(false);
      onClose();
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to delete user.", "error");
    },
  });

  const hardBanMutation = useApiMutation({
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
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to ban user.", "error");
    },
  });

  const unbanMutation = useApiMutation({
    mutationFn: async () => {
      await apiClient.post(ADMIN_ENDPOINTS.USER_UNBAN(userId!), {});
    },
    onSuccess: () => {
      showToast("User unbanned.", "success");
      invalidate();
      onClose();
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to unban user.", "error");
    },
  });

  const softBanMutation = useApiMutation({
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
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to apply soft ban.", "error");
    },
  });

  const liftSoftBanMutation = useApiMutation({
    mutationFn: async (action: string) => {
      await apiClient.delete(ADMIN_ENDPOINTS.USER_SOFT_BAN_LIFT(userId!, action));
    },
    onSuccess: () => {
      showToast("Soft ban lifted.", "success");
      invalidate();
    },
    onError: (err: unknown) => {
      showToast((err as Error)?.message ?? "Failed to lift soft ban.", "error");
    },
  });

  const isHardBanned = currentIsHardBanned ?? false;
  const softBans = currentSoftBans ?? [];

  const renderInfoCard = () =>
    userId ? (
      <Div surface="muted" rounded="lg" border="default" className="text-xs" padding="inlineSm">
        <Stack gap="xs" className="text-zinc-700 dark:text-zinc-300">
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

  const renderRoleSection = () => (
    <Select
      label="Role"
      options={ROLE_OPTIONS}
      value={role}
      onValueChange={setRole}
    />
  );

  const renderEmailVerifiedSection = () => (
    <Toggle
      label="Email verified"
      checked={emailVerified}
      onChange={setEmailVerified}
    />
  );

  const renderProfileSection = () => (
    <Stack border="default" as="section" gap="sm" className="border-t" padding="t-sm">
      <Heading level={3} className="mb-1" color="muted" size="sm" weight="semibold">
        Profile details
      </Heading>
      <Input
        label="Display name"
        value={editDisplayName}
        onChange={(e) => setEditDisplayName(e.target.value)}
        placeholder="Full name shown on profile"
      />
      <Input
        label="Phone number"
        type="tel"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        placeholder="+91 90000 00000"
      />
      <Textarea
        label="Bio"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        rows={3}
        placeholder="Short bio shown on the public profile…"
      />
      <Input
        label="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="City, Country"
      />
      <Input
        label="Website"
        type="url"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        placeholder="https://"
      />
      <Text size="xs" color="muted">
        Social links
      </Text>
      <Input
        label="Twitter / X"
        value={twitter}
        onChange={(e) => setTwitter(e.target.value)}
        placeholder="@handle or full URL"
      />
      <Input
        label="Instagram"
        value={instagram}
        onChange={(e) => setInstagram(e.target.value)}
        placeholder="@handle or full URL"
      />
      <Input
        label="Facebook"
        value={facebook}
        onChange={(e) => setFacebook(e.target.value)}
        placeholder="https://facebook.com/…"
      />
      <Input
        label="LinkedIn"
        value={linkedin}
        onChange={(e) => setLinkedin(e.target.value)}
        placeholder="https://linkedin.com/in/…"
      />
    </Stack>
  );

  const renderAdminNotesSection = () => (
    <Textarea
      label="Admin notes (optional)"
      value={adminNotes}
      onChange={(e) => setAdminNotes(e.target.value)}
      rows={3}
      placeholder="Internal notes about this user…"
    />
  );

  const renderActionsSection = () => (
    <FormActions align="right">
      <Button
        type="button"
        variant="danger"
        onClick={() => setDeleteOpen(true)}
        disabled={!userId}
      >
        Delete user
      </Button>
      <Button type="button" variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button
        type="submit"
        isLoading={saveMutation.isPending}
        disabled={!userId || saveMutation.isPending}
      >
        Save changes
      </Button>
    </FormActions>
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
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }} padding="md">
          <StackedViewShell
            portal="admin"
            className="space-y-4"
            sections={[
              renderInfoCard,
              renderRoleSection,
              renderEmailVerifiedSection,
              renderProfileSection,
              renderAdminNotesSection,
              renderActionsSection,
              renderModerationSection,
            ]}
          />
        </Form>
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
