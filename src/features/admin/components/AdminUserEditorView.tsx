"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, ConfirmDeleteModal, Form, FormActions, Heading, Select, SideDrawer, Text, Toggle, useToast } from "../../../ui";
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
    <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Hard ban</span>
        {isHardBanned ? (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">Banned</span>
        ) : (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300">Active</span>
        )}
      </div>
      {isHardBanned ? (
        <div className="space-y-2">
          {currentHardBanReason && <Text className="text-xs text-zinc-600 dark:text-zinc-400">Reason: {currentHardBanReason}</Text>}
          <Button type="button" variant="secondary" size="sm" isLoading={unbanPending} disabled={unbanPending} onClick={onUnban}>Lift hard ban</Button>
        </div>
      ) : showHardBanForm ? (
        <div className="space-y-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Ban reason (required)</label>
            <textarea value={hardBanReasonInput} onChange={(e) => setHardBanReasonInput(e.target.value)} rows={2} placeholder="e.g. Repeated fraud, scam activity…"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="danger" size="sm" isLoading={hardBanPending} disabled={!hardBanReasonInput.trim() || hardBanPending} onClick={() => onHardBan(hardBanReasonInput.trim())}>Confirm hard ban</Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => { setShowHardBanForm(false); setHardBanReasonInput(""); }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="danger" size="sm" disabled={!userId} onClick={() => setShowHardBanForm(true)}>Impose hard ban</Button>
      )}
    </div>
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
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Soft bans{softBans.length > 0 ? ` (${softBans.length})` : ""}</span>
        {!showAddSoftBan && (
          <Button type="button" variant="secondary" size="sm" disabled={!userId} onClick={() => setShowAddSoftBan(true)}>Add soft ban</Button>
        )}
      </div>
      {softBans.length > 0 && (
        <ul className="mb-3 space-y-2">
          {softBans.map((ban) => (
            <li key={ban.action} className="flex items-start justify-between gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-zinc-800 dark:text-zinc-200">{formatBanAction(ban.action)}</div>
                <div className="text-zinc-500 dark:text-zinc-400">{ban.reason}</div>
                <div className="text-zinc-400 dark:text-zinc-500">{formatExpiry(ban.expiresAt)}</div>
              </div>
              <Button type="button" variant="secondary" size="sm" isLoading={liftPending} disabled={liftPending} onClick={() => onLiftSoftBan(ban.action)}>Lift</Button>
            </li>
          ))}
        </ul>
      )}
      {showAddSoftBan && (
        <div className="space-y-2">
          <Select label="Action to restrict" options={BANNED_ACTION_OPTIONS} value={softBanAction} onValueChange={setSoftBanAction} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Reason (required)</label>
            <textarea value={softBanReason} onChange={(e) => setSoftBanReason(e.target.value)} rows={2} placeholder="e.g. Suspicious bid activity…"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Expires at (optional — leave blank for permanent)</label>
            <input type="datetime-local" value={softBanExpiry} onChange={(e) => setSoftBanExpiry(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="primary" size="sm" isLoading={softBanPending} disabled={!softBanReason.trim() || softBanPending}
              onClick={() => onAddSoftBan({ action: softBanAction, reason: softBanReason.trim(), ...(softBanExpiry ? { expiresAt: new Date(softBanExpiry).toISOString() } : {}) })}>
              Apply soft ban
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => { setShowAddSoftBan(false); setSoftBanReason(""); setSoftBanExpiry(""); }}>Cancel</Button>
          </div>
        </div>
      )}
      {softBans.length === 0 && !showAddSoftBan && (
        <Text className="text-xs text-zinc-400 dark:text-zinc-500">No active soft bans.</Text>
      )}
    </div>
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
}: AdminUserEditorViewProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // --- General fields -------------------------------------------------------
  const [role, setRole] = React.useState(currentRole ?? "user");
  const [emailVerified, setEmailVerified] = React.useState(currentEmailVerified ?? false);
  const [adminNotes, setAdminNotes] = React.useState("");
  const [deleteOpen, setDeleteOpen] = React.useState(false);

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
      setShowHardBanForm(false);
      setHardBanReasonInput("");
      setShowAddSoftBan(false);
      setSoftBanAction(BANNED_ACTION_OPTIONS[0].value);
      setSoftBanReason("");
      setSoftBanExpiry("");
    }
  }, [open, currentRole, currentEmailVerified]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

  // --- Mutations ------------------------------------------------------------

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch(ADMIN_ENDPOINTS.USER_BY_ID(userId!), {
        role,
        emailVerified,
        adminNotes: adminNotes || undefined,
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

  const deleteMutation = useMutation({
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

  const hardBanMutation = useMutation({
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

  const unbanMutation = useMutation({
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

  const softBanMutation = useMutation({
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

  const liftSoftBanMutation = useMutation({
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
          }}
          className="space-y-4 p-4"
        >
          {/* ── Info card ── */}
          {userId && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900/40">
              <div className="flex flex-col gap-1 text-zinc-700 dark:text-zinc-300">
                <>
                  <span className="font-semibold">Owner ID (Firebase UID):</span>{" "}
                  <code className="select-all font-mono">{userId}</code>
                </>
                {ownedStoreId && (
                  <>
                    <span className="font-semibold">Owns store:</span>{" "}
                    <code className="select-all font-mono">{ownedStoreId}</code>
                    {ownedStoreName ? ` — ${ownedStoreName}` : ""}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Role ── */}
          <Select
            label="Role"
            options={ROLE_OPTIONS}
            value={role}
            onValueChange={setRole}
          />

          {/* ── Email verified ── */}
          <Toggle
            label="Email verified"
            checked={emailVerified}
            onChange={setEmailVerified}
          />

          {/* ── Admin notes ── */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Admin notes (optional)
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              placeholder="Internal notes about this user…"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

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

          {/* ── Moderation section ── */}
          <div className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
            <Heading level={3} className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
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
          </div>
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
