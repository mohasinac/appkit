"use client";

import React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Div,
  Grid,
  Heading,
  Input,
  Label,
  RichTextEditor,
  Row,
  Select,
  Stack,
  StackedViewShell,
  TagInput,
  Text,
  Textarea,
  Toggle,
} from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";
import { apiClient } from "../../../http";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import type {
  EventItem,
  EventType,
  EventStatus,
  FormFieldType,
  RaffleType,
  SpinPrize,
  SurveyFormField,
} from "../types";
import { StepDef, StepForm } from "../../shell";
import { ProductInlineSelect } from "../../seller/components/ProductInlineSelect";
import { CouponInlineSelect } from "../../seller/components/CouponInlineSelect";

// --- Constants ---------------------------------------------------------------

export interface AdminEventEditorViewProps extends Omit<StackedViewShellProps, "sections"> {
  eventId?: string;
  onSaved?: (id: string) => void;
  embedded?: boolean;
}

const CLS_REMOVE_BTN = "text-zinc-400 hover:text-red-500 transition-colors text-lg leading-none px-1 p-0 min-h-0 h-auto rounded-none";
const CLS_REMOVE_BTN_PX2 = "text-zinc-400 hover:text-red-500 transition-colors px-2 py-1 text-lg leading-none p-0 min-h-0 h-auto rounded-none";
const CLS_REMOVE_BTN_LG = "text-zinc-400 hover:text-red-500 text-lg leading-none px-2 p-0 min-h-0 h-auto rounded-none";
const CLS_RAFFLE_PANEL = "border border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20";
const CLS_RAFFLE_HEADING = "text-amber-900 dark:text-amber-100";
const CLS_RAFFLE_BODY = "text-amber-800 dark:text-amber-200";

const EVENT_TYPE_OPTIONS = [
  { label: "Sale", value: "sale" },
  { label: "Offer / Coupon", value: "offer" },
  { label: "Poll", value: "poll" },
  { label: "Survey", value: "survey" },
  { label: "Feedback", value: "feedback" },
  { label: "Raffle", value: "raffle" },
  { label: "Spin Wheel", value: "spin_wheel" },
];

const RAFFLE_TYPE_OPTIONS = [
  { label: "Open raffle (all confirmed entries)", value: "open_raffle" },
  { label: "Top N scorers", value: "top_n_scorers" },
  { label: "Top N earliest participants", value: "top_n_participants" },
  { label: "Spin wheel", value: "spin_wheel" },
];

const EVENT_STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "Active", value: "active" },
  { label: "Paused", value: "paused" },
  { label: "Ended", value: "ended" },
];

const FORM_FIELD_TYPE_OPTIONS = [
  { label: "Short text", value: "text" },
  { label: "Long text", value: "textarea" },
  { label: "Email", value: "email" },
  { label: "Phone", value: "phone" },
  { label: "Number", value: "number" },
  { label: "Dropdown (select)", value: "select" },
  { label: "Multi-select", value: "multiselect" },
  { label: "Checkbox", value: "checkbox" },
  { label: "Radio", value: "radio" },
  { label: "Date", value: "date" },
  { label: "Rating (1–5)", value: "rating" },
  { label: "File upload", value: "file" },
];

const FIELD_TYPES_WITH_OPTIONS: FormFieldType[] = ["select", "multiselect", "radio", "checkbox"];

// --- FormFieldBuilder (extracted to keep AdminEventEditorView below line threshold) ---

interface FormFieldBuilderProps {
  fields: SurveyFormField[];
  setFields: (newFields: SurveyFormField[]) => void;
}

function FormFieldBuilder({ fields, setFields }: FormFieldBuilderProps) {
  const addField = () =>
    setFields([...fields, { id: `field-${Date.now()}`, type: "text" as FormFieldType, label: "", required: false, order: fields.length }]);
  const removeField = (id: string) => setFields(fields.filter((f) => f.id !== id));
  const updateField = (id: string, patch: Partial<SurveyFormField>) =>
    setFields(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  return (
    <Stack gap="sm">
      <Text size="xs" weight="medium" color="muted" className="uppercase tracking-wide">Form fields</Text>
      {fields.length === 0 && (
        <Text size="xs" color="muted">No fields yet. Add fields to collect responses from participants.</Text>
      )}
      {fields.map((field, idx) => {
        const hasOptions = FIELD_TYPES_WITH_OPTIONS.includes(field.type);
        const isNumeric = field.type === "number" || field.type === "rating";
        const isText = field.type === "text" || field.type === "textarea" || field.type === "email";
        return (
          <Stack key={field.id} gap="xs" surface="default" rounded="lg" border="default" padding="sm">
            <Row justify="between" gap="xs">
              <Text size="xs" weight="medium" color="muted">Field {idx + 1}</Text>
              <Button variant="ghost" type="button" onClick={() => removeField(field.id)} className={CLS_REMOVE_BTN} aria-label="Remove field">×</Button>
            </Row>
            <Grid cols={2} gap="xs">
              <Select label="Type" value={field.type} options={FORM_FIELD_TYPE_OPTIONS} onChange={(e) => updateField(field.id, { type: e.target.value as FormFieldType, options: undefined })} />
              <Input label="Label" value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} placeholder="e.g. Describe your entry" required />
            </Grid>
            {!hasOptions && field.type !== "date" && field.type !== "file" && field.type !== "rating" && (
              <Input label="Placeholder (optional)" value={field.placeholder ?? ""} onChange={(e) => updateField(field.id, { placeholder: e.target.value || undefined })} placeholder="Hint shown inside the field" />
            )}
            {hasOptions && (
              <Textarea
                label="Options — one per line"
                value={(field.options ?? []).join("\n")}
                onChange={(e) => updateField(field.id, { options: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                placeholder={"Option A\nOption B\nOption C"}
                rows={3}
              />
            )}
            {(isText || isNumeric) && (
              <Stack gap="xs" surface="muted" rounded="md" padding="xs">
                <Text size="xs" color="muted">Validation (optional)</Text>
                <Grid gap="xs" className="grid-cols-2">
                  {isText && (
                    <>
                      <Input label="Min length" type="number" value={String(field.validation?.minLength ?? "")} onChange={(e) => updateField(field.id, { validation: { ...field.validation, minLength: e.target.value ? Number(e.target.value) : undefined } })} placeholder="0" />
                      <Input label="Max length" type="number" value={String(field.validation?.maxLength ?? "")} onChange={(e) => updateField(field.id, { validation: { ...field.validation, maxLength: e.target.value ? Number(e.target.value) : undefined } })} placeholder="500" />
                    </>
                  )}
                  {isNumeric && (
                    <>
                      <Input label="Min value" type="number" value={String(field.validation?.min ?? "")} onChange={(e) => updateField(field.id, { validation: { ...field.validation, min: e.target.value ? Number(e.target.value) : undefined } })} placeholder="0" />
                      <Input label="Max value" type="number" value={String(field.validation?.max ?? "")} onChange={(e) => updateField(field.id, { validation: { ...field.validation, max: e.target.value ? Number(e.target.value) : undefined } })} placeholder="100" />
                    </>
                  )}
                </Grid>
                {field.type === "text" && (
                  <Input label="Pattern (regex, optional)" value={field.validation?.pattern ?? ""} onChange={(e) => updateField(field.id, { validation: { ...field.validation, pattern: e.target.value || undefined } })} placeholder="^[A-Z].*" />
                )}
              </Stack>
            )}
            <Toggle checked={field.required} onChange={(v) => updateField(field.id, { required: v })} label="Required" />
          </Stack>
        );
      })}
      <Button type="button" variant="outline" size="sm" onClick={addField}>+ Add field</Button>
    </Stack>
  );
}

const POLL_VISIBILITY_OPTIONS = [
  { label: "Always visible", value: "always" },
  { label: "After voting", value: "after_vote" },
  { label: "After event ends", value: "after_end" },
];

// --- Types -------------------------------------------------------------------

interface EventDraft {
  type: EventType;
  title: string;
  slug: string;
  description: string;
  startsAt: string;
  endsAt: string;
  coverImageUrl: string;
  tags: string[];
  status: EventStatus;
  createdBy: string;
  // Sale
  discountPercent: string;
  saleBannerText: string;
  // Offer
  couponId: string;
  displayCode: string;
  offerBannerText: string;
  // Poll
  pollOptions: { id: string; label: string }[];
  allowMultiSelect: boolean;
  allowComment: boolean;
  resultsVisibility: "always" | "after_vote" | "after_end";
  // Survey
  requireLogin: boolean;
  maxEntriesPerUser: string;
  hasLeaderboard: boolean;
  hasPointSystem: boolean;
  pointsLabel: string;
  entryReviewRequired: boolean;
  surveyFields: SurveyFormField[];
  // Feedback
  anonymous: boolean;
  feedbackFields: SurveyFormField[];
  // Raffle
  hasRaffle: boolean;
  raffleType: RaffleType;
  raffleTopN: string;
  rafflePrize: string;
  rafflePrizeCouponId: string;
  rafflePrizeProductIds: string[];
  spinPrizes: SpinPrize[];
  spinMaxPerUser: string;
  spinWindowStart: string;
  spinWindowEnd: string;
}

interface EventApiResponse {
  data: EventItem;
}

// --- Helpers -----------------------------------------------------------------

function toEventSlug(str: string): string {
  const base = str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base.startsWith("event-") ? base : `event-${base}`;
}

function toLocalDatetime(iso: string | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

function toISOString(local: string): string {
  if (!local) return "";
  try {
    return new Date(local).toISOString();
  } catch {
    return "";
  }
}

const DEFAULT_DRAFT: EventDraft = {
  type: "sale",
  title: "",
  slug: "",
  description: "",
  startsAt: "",
  endsAt: "",
  coverImageUrl: "",
  tags: [],
  status: "draft",
  createdBy: "",
  discountPercent: "10",
  saleBannerText: "",
  couponId: "",
  displayCode: "",
  offerBannerText: "",
  pollOptions: [{ id: "opt1", label: "" }, { id: "opt2", label: "" }],
  allowMultiSelect: false,
  allowComment: false,
  resultsVisibility: "always",
  requireLogin: true,
  maxEntriesPerUser: "1",
  hasLeaderboard: false,
  hasPointSystem: false,
  pointsLabel: "Points",
  entryReviewRequired: false,
  surveyFields: [],
  anonymous: false,
  feedbackFields: [],
  hasRaffle: false,
  raffleType: "open_raffle",
  raffleTopN: "10",
  rafflePrize: "",
  rafflePrizeCouponId: "",
  rafflePrizeProductIds: [],
  spinPrizes: [],
  spinMaxPerUser: "1",
  spinWindowStart: "",
  spinWindowEnd: "",
};

// --- Pure build helpers (module-level, no component closure) -----------------

function buildEventTypeConfig(draft: EventDraft): Record<string, unknown> {
  if (draft.type === "sale") return { saleConfig: { discountPercent: Number(draft.discountPercent) || 10, bannerText: draft.saleBannerText || undefined } };
  if (draft.type === "offer") return { offerConfig: { couponId: draft.couponId, displayCode: draft.displayCode, bannerText: draft.offerBannerText || undefined } };
  if (draft.type === "poll") return { pollConfig: { options: draft.pollOptions.filter((o) => o.label.trim()), allowMultiSelect: draft.allowMultiSelect, allowComment: draft.allowComment, resultsVisibility: draft.resultsVisibility } };
  if (draft.type === "survey") return { surveyConfig: { requireLogin: draft.requireLogin, maxEntriesPerUser: Number(draft.maxEntriesPerUser) || 1, hasLeaderboard: draft.hasLeaderboard, hasPointSystem: draft.hasPointSystem, pointsLabel: draft.hasPointSystem ? (draft.pointsLabel.trim() || "Points") : undefined, entryReviewRequired: draft.entryReviewRequired, formFields: draft.surveyFields.map((f, i) => ({ ...f, order: i })) } };
  if (draft.type === "feedback") return { feedbackConfig: { anonymous: draft.anonymous, formFields: draft.feedbackFields.map((f, i) => ({ ...f, order: i })) } };
  return {};
}

function buildEventRaffleFields(draft: EventDraft): Record<string, unknown> {
  const isRaffleType = draft.type === "raffle" || draft.type === "spin_wheel";
  const fields: Record<string, unknown> = {};
  if (!draft.hasRaffle && !isRaffleType) return fields;
  fields.hasRaffle = true;
  fields.raffleType = isRaffleType && draft.type === "spin_wheel" ? "spin_wheel" : draft.raffleType;
  if (Number(draft.raffleTopN) > 0) fields.raffleTopN = Number(draft.raffleTopN);
  if (draft.rafflePrize) fields.rafflePrize = draft.rafflePrize;
  if (draft.rafflePrizeCouponId) fields.rafflePrizeCouponId = draft.rafflePrizeCouponId;
  if (draft.rafflePrizeProductIds.length > 0) fields.rafflePrizeProductIds = draft.rafflePrizeProductIds;
  if (draft.raffleType === "spin_wheel" || draft.type === "spin_wheel") {
    fields.spinPrizes = draft.spinPrizes;
    if (Number(draft.spinMaxPerUser) > 0) fields.spinMaxPerUser = Number(draft.spinMaxPerUser);
    if (draft.spinWindowStart) fields.spinWindowStart = toISOString(draft.spinWindowStart);
    if (draft.spinWindowEnd) fields.spinWindowEnd = toISOString(draft.spinWindowEnd);
  }
  return fields;
}

// --- Component ---------------------------------------------------------------

export function AdminEventEditorView({
  eventId,
  onSaved,
  embedded,
  ...rest
}: AdminEventEditorViewProps) {
  const isEdit = Boolean(eventId);
  const [draft, setDraft] = React.useState<EventDraft>(DEFAULT_DRAFT);
  const [slugManual, setSlugManual] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);
  const [triggerMessage, setTriggerMessage] = React.useState<string | null>(null);
  const [raffleWinnerName, setRaffleWinnerName] = React.useState("");
  const [raffleEntryCount, setRaffleEntryCount] = React.useState<number | null>(null);
  const [raffleGithubUrl, setRaffleGithubUrl] = React.useState("");

  const update = React.useCallback((partial: Partial<EventDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
    setSaveMessage(null);
  }, []);

  // --- load existing event ---
  const eventQuery = useQuery<EventApiResponse>({
    queryKey: ["admin-event-by-id", eventId],
    queryFn: () => apiClient.get<EventApiResponse>(`${ADMIN_ENDPOINTS.EVENTS}/${eventId}`),
    enabled: Boolean(eventId),
    staleTime: 15_000,
  });

  React.useEffect(() => {
    const event = (eventQuery.data as any)?.data ?? (eventQuery.data as any);
    if (!event?.id) return;
    setDraft({
      type: event.type || "sale",
      title: event.title || "",
      slug: event.slug || "",
      description: event.description || "",
      startsAt: toLocalDatetime(event.startsAt),
      endsAt: toLocalDatetime(event.endsAt),
      coverImageUrl: event.coverImageUrl || event.coverImage?.url || "",
      tags: Array.isArray(event.tags) ? event.tags : [],
      status: event.status || "draft",
      createdBy: event.createdBy || "",
      discountPercent: String(event.saleConfig?.discountPercent ?? 10),
      saleBannerText: event.saleConfig?.bannerText || "",
      couponId: event.offerConfig?.couponId || "",
      displayCode: event.offerConfig?.displayCode || "",
      offerBannerText: event.offerConfig?.bannerText || "",
      pollOptions: event.pollConfig?.options?.length
        ? event.pollConfig.options
        : [{ id: "opt1", label: "" }, { id: "opt2", label: "" }],
      allowMultiSelect: Boolean(event.pollConfig?.allowMultiSelect),
      allowComment: Boolean(event.pollConfig?.allowComment),
      resultsVisibility: event.pollConfig?.resultsVisibility || "always",
      requireLogin: event.surveyConfig?.requireLogin !== false,
      maxEntriesPerUser: String(event.surveyConfig?.maxEntriesPerUser ?? 1),
      hasLeaderboard: Boolean(event.surveyConfig?.hasLeaderboard),
      hasPointSystem: Boolean(event.surveyConfig?.hasPointSystem),
      pointsLabel: event.surveyConfig?.pointsLabel ?? "Points",
      entryReviewRequired: Boolean(event.surveyConfig?.entryReviewRequired),
      surveyFields: Array.isArray(event.surveyConfig?.formFields) ? event.surveyConfig.formFields : [],
      anonymous: Boolean(event.feedbackConfig?.anonymous),
      feedbackFields: Array.isArray(event.feedbackConfig?.formFields) ? event.feedbackConfig.formFields : [],
      hasRaffle: Boolean(event.hasRaffle),
      raffleType: (event.raffleType as RaffleType) || "open_raffle",
      raffleTopN: String(event.raffleTopN ?? 10),
      rafflePrize: event.rafflePrize || "",
      rafflePrizeCouponId: event.rafflePrizeCouponId || "",
      rafflePrizeProductIds: Array.isArray(event.rafflePrizeProductIds) ? event.rafflePrizeProductIds : [],
      spinPrizes: Array.isArray(event.spinPrizes) ? event.spinPrizes : [],
      spinMaxPerUser: String(event.spinMaxPerUser ?? 1),
      spinWindowStart: toLocalDatetime(event.spinWindowStart),
      spinWindowEnd: toLocalDatetime(event.spinWindowEnd),
    });
    setSlugManual(true);
    setRaffleWinnerName(event.raffleWinnerDisplayName || "");
    setRaffleEntryCount(typeof event.raffleEntryCount === "number" ? event.raffleEntryCount : null);
    setRaffleGithubUrl(event.raffleGithubFunctionUrl || "");
  }, [eventQuery.data]);

  // --- save ---
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        type: draft.type,
        title: draft.title,
        slug: draft.slug || toEventSlug(draft.title),
        description: draft.description,
        tags: draft.tags,
        startsAt: toISOString(draft.startsAt),
        endsAt: toISOString(draft.endsAt),
        coverImageUrl: draft.coverImageUrl || undefined,
        ...buildEventTypeConfig(draft),
        ...buildEventRaffleFields(draft),
      };

      if (eventId) {
        payload.status = draft.status;
        await apiClient.patch(`${ADMIN_ENDPOINTS.EVENTS}/${eventId}`, payload);
        return eventId;
      }
      const created = await apiClient.post<{ data: { id: string }; id?: string }>(ADMIN_ENDPOINTS.EVENTS, payload);
      return (created as any).data?.id ?? (created as any).id ?? "";
    },
    onSuccess: (savedId) => {
      setSaveMessage("Saved successfully.");
      if (savedId) onSaved?.(savedId);
    },
    onError: (error) => {
      setSaveMessage(error instanceof Error ? error.message : "Save failed");
    },
  });

  // --- raffle trigger ---
  const triggerRaffleMutation = useMutation({
    mutationFn: async () => {
      if (!eventId) throw new Error("Save the event before triggering");
      return apiClient.post<{ data: { raffleWinnerDisplayName?: string; raffleEntryCount?: number } }>(
        ADMIN_ENDPOINTS.EVENT_TRIGGER_RAFFLE(eventId),
        {},
      );
    },
    onSuccess: (res) => {
      const data = (res as any).data ?? res;
      setTriggerMessage(data?.raffleWinnerDisplayName ? `Winner: ${data.raffleWinnerDisplayName}` : "Raffle triggered.");
      if (data?.raffleWinnerDisplayName) setRaffleWinnerName(data.raffleWinnerDisplayName);
      if (typeof data?.raffleEntryCount === "number") setRaffleEntryCount(data.raffleEntryCount);
    },
    onError: (err) => {
      setTriggerMessage(err instanceof Error ? err.message : "Trigger failed");
    },
  });

  const isLoading = saveMutation.isPending || eventQuery.isLoading;

  // --- steps ---
  const steps: StepDef<EventDraft>[] = [
    {
      label: "Details",
      validate: (values) => {
        if (!values.title.trim()) return "Title is required";
        if (!values.startsAt) return "Start date is required";
        if (!values.endsAt) return "End date is required";
        return null;
      },
      render: ({ values, onChange }) => (
        <Stack gap="md">
          <Heading level={3} className="mb-2">Event Details</Heading>
          {!isEdit && (
            <Select
              label="Event type"
              value={values.type}
              options={EVENT_TYPE_OPTIONS}
              onChange={(e) => onChange({ type: e.target.value as EventType })}
            />
          )}
          <Input
            label="Title"
            value={values.title}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ title: v, ...(!slugManual && { slug: toEventSlug(v) }) });
            }}
            placeholder="Charizard Flash Sale 2026"
            required
          />
          <Input
            label="Slug"
            value={values.slug}
            onChange={(e) => { setSlugManual(true); onChange({ slug: e.target.value }); }}
            placeholder="event-charizard-flash-sale-2026"
            helperText="Auto-generated from title. Must start with 'event-'."
          />
          <Stack gap="xs">
            <Label>Description</Label>
            <RichTextEditor value={values.description} onChange={(v) => onChange({ description: v })} minHeightClassName="min-h-[120px]" placeholder="Describe this event…" />
          </Stack>
          <Grid cols={2} gap="sm">
            <Input label="Starts at" type="datetime-local" value={values.startsAt} onChange={(e) => onChange({ startsAt: e.target.value })} required />
            <Input label="Ends at" type="datetime-local" value={values.endsAt} onChange={(e) => onChange({ endsAt: e.target.value })} required />
          </Grid>
          <TagInput label="Tags" value={values.tags} onChange={(t) => onChange({ tags: t })} placeholder="e.g. pokemon, sale, 2026" />
        </Stack>
      ),
    },
    {
      label: "Media",
      render: ({ values, onChange }) => (
        <Stack gap="md">
          <Heading level={3} className="mb-2">Media</Heading>
          <Input
            label="Cover Image URL (optional)"
            value={values.coverImageUrl}
            onChange={(e) => onChange({ coverImageUrl: e.target.value })}
            placeholder="https://…"
            helperText="Direct link to the event cover image."
          />
        </Stack>
      ),
    },
    {
      label: "Settings",
      validate: (values) => {
        if (values.type === "offer" && !values.couponId.trim()) return "Coupon ID is required for offer events";
        if (values.type === "offer" && !values.displayCode.trim()) return "Display code is required for offer events";
        if (values.type === "poll" && values.pollOptions.filter((o) => o.label.trim()).length < 2) return "Poll events require at least 2 options";
        return null;
      },
      render: ({ values, onChange }) => (
        <Stack gap="md">
          <Heading level={3} className="mb-2">Event Settings</Heading>
          {isEdit && (
            <Select label="Status" value={values.status} options={EVENT_STATUS_OPTIONS} onChange={(e) => onChange({ status: e.target.value as EventStatus })} />
          )}
          {values.createdBy && (
            <Stack gap="none">
              <Text size="sm" weight="medium" className="mb-1">Created by</Text>
              <Text size="sm" color="muted">{values.createdBy}</Text>
            </Stack>
          )}

          {/* Sale config */}
          {values.type === "sale" && (
            <Stack gap="xs" surface="muted" rounded="lg" border="default" padding="sm">
              <Text size="sm" weight="semibold" color="muted">Sale configuration</Text>
              <Grid cols={2} gap="sm">
                <Input label="Discount %" type="number" value={values.discountPercent} onChange={(e) => onChange({ discountPercent: e.target.value })} placeholder="10" />
                <Input label="Banner text (optional)" value={values.saleBannerText} onChange={(e) => onChange({ saleBannerText: e.target.value })} placeholder="Limited time — ends Sunday!" />
              </Grid>
            </Stack>
          )}

          {/* Offer config */}
          {values.type === "offer" && (
            <Stack gap="xs" surface="muted" rounded="lg" border="default" padding="sm">
              <Text size="sm" weight="semibold" color="muted">Offer configuration</Text>
              <Grid cols={2} gap="sm">
                <Div>
                  <Text size="sm" weight="medium" className="mb-1">Coupon</Text>
                  <CouponInlineSelect
                    scope="admin"
                    value={values.couponId}
                    onChange={(id) => onChange({ couponId: id ?? "" })}
                    placeholder="Search coupons…"
                    allowCreate={false}
                  />
                </Div>
                <Input label="Display code" value={values.displayCode} onChange={(e) => onChange({ displayCode: e.target.value })} placeholder="CHARIZARD25" required />
              </Grid>
              <Input label="Banner text (optional)" value={values.offerBannerText} onChange={(e) => onChange({ offerBannerText: e.target.value })} placeholder="Use CHARIZARD25 at checkout" />
            </Stack>
          )}

          {/* Poll config */}
          {values.type === "poll" && (
            <Stack gap="md" rounded="xl" border="default" padding="md">
              <Text size="sm" weight="semibold" color="muted">Poll configuration</Text>
              <Stack gap="xs">
                <Text size="xs" color="muted">Options (minimum 2)</Text>
                {values.pollOptions.map((opt, idx) => (
                  <Row key={opt.id} gap="xs">
                    <Div className="flex-1">
                      <Input
                        value={opt.label}
                        onChange={(e) => onChange({ pollOptions: values.pollOptions.map((o) => o.id === opt.id ? { ...o, label: e.target.value } : o) })}
                        placeholder={`Option ${idx + 1}`}
                      />
                    </Div>
                    {values.pollOptions.length > 2 && (
                      <Button variant="ghost" type="button" onClick={() => onChange({ pollOptions: values.pollOptions.filter((o) => o.id !== opt.id) })} className={CLS_REMOVE_BTN_PX2} aria-label="Remove option">×</Button>
                    )}
                  </Row>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => onChange({ pollOptions: [...values.pollOptions, { id: `opt${Date.now()}`, label: "" }] })}>+ Add option</Button>
              </Stack>
              <Select label="Results visibility" value={values.resultsVisibility} options={POLL_VISIBILITY_OPTIONS} onChange={(e) => onChange({ resultsVisibility: e.target.value as "always" | "after_vote" | "after_end" })} />
              <Stack gap="sm">
                <Toggle checked={values.allowMultiSelect} onChange={(v) => onChange({ allowMultiSelect: v })} label="Allow multi-select" />
                <Toggle checked={values.allowComment} onChange={(v) => onChange({ allowComment: v })} label="Allow comment with vote" />
              </Stack>
            </Stack>
          )}

          {/* Survey config */}
          {values.type === "survey" && (
            <Stack gap="md" rounded="xl" border="default" padding="md">
              <Text size="sm" weight="semibold" color="muted">Survey configuration</Text>
              <Grid cols={2} gap="sm">
                <Input label="Max entries per user" type="number" value={values.maxEntriesPerUser} onChange={(e) => onChange({ maxEntriesPerUser: e.target.value })} placeholder="1" />
                {values.hasPointSystem && (
                  <Input label="Points label" value={values.pointsLabel} onChange={(e) => onChange({ pointsLabel: e.target.value })} placeholder="Points" />
                )}
              </Grid>
              <Stack gap="xs">
                <Toggle checked={values.requireLogin} onChange={(v) => onChange({ requireLogin: v })} label="Require login to participate" />
                <Toggle checked={values.hasLeaderboard} onChange={(v) => onChange({ hasLeaderboard: v })} label="Show leaderboard" />
                <Toggle checked={values.hasPointSystem} onChange={(v) => onChange({ hasPointSystem: v })} label="Enable point system" />
                <Toggle checked={values.entryReviewRequired} onChange={(v) => onChange({ entryReviewRequired: v })} label="Require employee review before entry is approved" />
              </Stack>
              <FormFieldBuilder fields={values.surveyFields} setFields={(f) => onChange({ surveyFields: f })} />
            </Stack>
          )}

          {/* Feedback config */}
          {values.type === "feedback" && (
            <Stack gap="md" rounded="xl" border="default" padding="md">
              <Text size="sm" weight="semibold" color="muted">Feedback configuration</Text>
              <Toggle checked={values.anonymous} onChange={(v) => onChange({ anonymous: v })} label="Allow anonymous submissions" />
              <FormFieldBuilder fields={values.feedbackFields} setFields={(f) => onChange({ feedbackFields: f })} />
            </Stack>
          )}
        </Stack>
      ),
    },
    {
      label: "Raffle / Spin",
      render: ({ values, onChange }) => {
        const isRaffleType = values.type === "raffle" || values.type === "spin_wheel";
        const showRaffleConfig = isRaffleType || values.hasRaffle;
        const isSpinMode = values.type === "spin_wheel" || values.raffleType === "spin_wheel";
        return (
          <Stack gap="md">
            <Heading level={3} className="mb-2">Raffle &amp; Spin Wheel</Heading>
            {!isRaffleType && (
              <Toggle checked={values.hasRaffle} onChange={(v) => onChange({ hasRaffle: v })} label="Attach a raffle to this event" />
            )}
            {!isRaffleType && !values.hasRaffle && (
              <Text size="sm" color="muted">
                Enable the toggle above to attach a raffle draw to this event. Not applicable for this event type by default.
              </Text>
            )}
            {showRaffleConfig && (
              <Stack gap="md" rounded="xl" border="default" padding="md">
                <Grid cols={2} gap="sm">
                  <Select label="Raffle type" value={values.type === "spin_wheel" ? "spin_wheel" : values.raffleType} options={RAFFLE_TYPE_OPTIONS} onChange={(e) => onChange({ raffleType: e.target.value as RaffleType })} disabled={values.type === "spin_wheel"} />
                  <Input label="Top N (for top-N raffle types)" type="number" value={values.raffleTopN} onChange={(e) => onChange({ raffleTopN: e.target.value })} placeholder="10" />
                </Grid>
                <Input label="Prize description" value={values.rafflePrize} onChange={(e) => onChange({ rafflePrize: e.target.value })} placeholder="₹2,000 store credit + exclusive Pikachu sticker" />
                <Div>
                  <Text size="sm" weight="medium" className="mb-1">Coupon for winner (optional)</Text>
                  <CouponInlineSelect
                    scope="admin"
                    value={values.rafflePrizeCouponId}
                    onChange={(id) => onChange({ rafflePrizeCouponId: id ?? "" })}
                    placeholder="Search coupons…"
                    allowCreate={false}
                  />
                </Div>
                <Div>
                  <Text size="sm" weight="medium" className="mb-1">Prize products (optional)</Text>
                  <ProductInlineSelect
                    scope="admin"
                    multiple
                    value={values.rafflePrizeProductIds}
                    onChange={(ids) => onChange({ rafflePrizeProductIds: ids })}
                    placeholder="Search products to feature as prizes…"
                  />
                  <Text size="xs" color="muted" className="mt-1">Products shown to winners or displayed as the prize showcase.</Text>
                </Div>

                {isSpinMode && (
                  <Stack gap="sm" rounded="lg" border="default" padding="sm">
                    <Text size="xs" weight="medium" color="muted">Spin prizes (weighted random)</Text>
                    {values.spinPrizes.length === 0 && (
                      <Text size="xs" color="muted">No spin prizes yet. Add at least one to enable spinning.</Text>
                    )}
                    {values.spinPrizes.map((p) => (
                      <Grid key={p.id} gap="xs" className="grid-cols-12 items-end">
                        <Div className="col-span-5">
                          <Input label="Label" value={p.label} onChange={(e) => onChange({ spinPrizes: values.spinPrizes.map((sp) => sp.id === p.id ? { ...sp, label: e.target.value } : sp) })} placeholder="₹100 off" />
                        </Div>
                        <Div className="col-span-3">
                          <Text size="xs" weight="medium" className="mb-1">Coupon</Text>
                          <CouponInlineSelect
                            scope="admin"
                            value={p.couponId ?? ""}
                            onChange={(id) => onChange({ spinPrizes: values.spinPrizes.map((sp) => sp.id === p.id ? { ...sp, couponId: id || undefined } : sp) })}
                            placeholder="Search…"
                            allowCreate={false}
                          />
                        </Div>
                        <Div className="col-span-2">
                          <Input label="Weight" type="number" value={String(p.weight)} onChange={(e) => onChange({ spinPrizes: values.spinPrizes.map((sp) => sp.id === p.id ? { ...sp, weight: Number(e.target.value) || 0 } : sp) })} />
                        </Div>
                        <Row centered className="col-span-1 pb-2">
                          <Toggle checked={p.isActive} onChange={(v) => onChange({ spinPrizes: values.spinPrizes.map((sp) => sp.id === p.id ? { ...sp, isActive: v } : sp) })} label="" />
                        </Row>
                        <Row centered className="col-span-1 pb-2">
                          <Button variant="ghost" type="button" onClick={() => onChange({ spinPrizes: values.spinPrizes.filter((sp) => sp.id !== p.id) })} className={CLS_REMOVE_BTN_LG} aria-label="Remove prize">×</Button>
                        </Row>
                      </Grid>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => onChange({ spinPrizes: [...values.spinPrizes, { id: `prize-${Date.now()}`, label: "", couponId: undefined, weight: 1, isActive: true }] })}>+ Add spin prize</Button>
                    <Input label="Max spins per user" type="number" value={values.spinMaxPerUser} onChange={(e) => onChange({ spinMaxPerUser: e.target.value })} placeholder="1" />
                    <Grid cols={2} gap="sm">
                      <Input label="Spin window start" type="datetime-local" value={values.spinWindowStart} onChange={(e) => onChange({ spinWindowStart: e.target.value })} />
                      <Input label="Spin window end" type="datetime-local" value={values.spinWindowEnd} onChange={(e) => onChange({ spinWindowEnd: e.target.value })} />
                    </Grid>
                  </Stack>
                )}

                {/* Manual trigger + winner (edit mode only) */}
                {isEdit && (
                  <Stack gap="xs" rounded="lg" padding="sm" className={CLS_RAFFLE_PANEL}>
                    <Row justify="between" gap="sm">
                      <Text size="sm" weight="medium" className={CLS_RAFFLE_HEADING}>
                        {raffleWinnerName ? `Winner: ${raffleWinnerName}` : "Raffle not yet triggered"}
                      </Text>
                      <Button type="button" variant="primary" size="sm" onClick={() => triggerRaffleMutation.mutate()} disabled={triggerRaffleMutation.isPending || Boolean(raffleWinnerName)}>
                        {triggerRaffleMutation.isPending ? "Triggering…" : raffleWinnerName ? "Already triggered" : "Trigger Raffle Now"}
                      </Button>
                    </Row>
                    {raffleEntryCount !== null && <Text size="xs" className={CLS_RAFFLE_BODY}>Pool size: {raffleEntryCount}</Text>}
                    {raffleGithubUrl && <Text size="xs" className={`break-all ${CLS_RAFFLE_BODY}`}>Fairness proof: {raffleGithubUrl}</Text>}
                    {triggerMessage && <Text size="xs" className={CLS_RAFFLE_HEADING}>{triggerMessage}</Text>}
                  </Stack>
                )}
              </Stack>
            )}
          </Stack>
        );
      },
    },
  ];

  const alertSection = eventQuery.error ? (
    <Alert variant="error" title="Could not load event">
      {eventQuery.error instanceof Error ? eventQuery.error.message : "Unknown error"}
    </Alert>
  ) : null;

  const formContent = (
    <Stack gap="sm">
      {alertSection}
      <StepForm<EventDraft>
        steps={steps}
        values={draft}
        onChange={update}
        onComplete={() => { saveMutation.mutate(); }}
        formId="admin-event"
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        completeLabel={isEdit ? "Save Changes" : "Create Event"}
        isLoading={isLoading}
      />
      {saveMessage && (
        <Alert variant={saveMessage.toLowerCase().includes("fail") || saveMessage.toLowerCase().includes("error") ? "error" : "success"} title="Save status">
          {saveMessage}
        </Alert>
      )}
    </Stack>
  );

  if (embedded) {
    return <Div className="overflow-y-auto p-4">{formContent}</Div>;
  }

  return (
    <StackedViewShell
      portal="admin"
      {...rest}
      title={isEdit ? "Edit Event" : "Create Event"}
      sections={[formContent]}
    />
  );
}
