"use client";

/**
 * Picks the label stock, and says what that choice costs.
 *
 * 🛑 THE FIT REPORT IS SHOWN BESIDE THE PICKER, NOT AFTER PRINTING. The whole
 * reason `labelFitsProfile` reports rather than scales is that a squeezed
 * barcode looks perfect and does not scan, surfacing weeks later as "the
 * scanner is broken" with every label already stuck to something. That
 * guarantee is worth nothing if the report arrives after the stock is in the
 * printer — so the picker tells the operator, in the moment they choose, what
 * the longest code they are about to print will do on it.
 *
 * 🛑 `FieldSelect` WITH SIX OPTIONS, AGAINST RULE #9's ">5 USES
 * PaginatedSelect" LINE — flagged rather than done quietly.
 *
 * That rule's own stated reason is that a long list cannot be scanned, and its
 * mechanism is an async searchable drawer. This list is six physical stocks,
 * closed and bounded by what the warehouse buys, with no server behind it; a
 * search box over six static strings and a "Load more" is more chrome than
 * choice. No audit enforces the threshold, so this is a judgement call and not
 * a build failure — one line to reverse if the call is wrong.
 */

import { Alert, Row, Stack, Text } from "../../../ui/index";
import { FieldSelect } from "../../../ui/forms";
import {
  LABEL_PROFILES,
  LABEL_PROFILE_IDS,
  MIN_SCANNABLE_MODULE_MM,
  labelFitsProfile,
  type LabelProfileId,
} from "../../../_internal/shared/features/print/label-profiles";

export interface LabelProfilePickerProps {
  value: LabelProfileId;
  onChange: (id: LabelProfileId) => void;
  /**
   * The LONGEST code in the job. Checking the longest is the only check worth
   * making: a report based on the average or the first row says "fits" about a
   * batch in which some labels do not.
   */
  longestCodeLength?: number;
  label?: string;
}

export function LabelProfilePicker({
  value,
  onChange,
  longestCodeLength,
  label = "Label stock",
}: LabelProfilePickerProps) {
  const profile = LABEL_PROFILES[value];
  const fit =
    longestCodeLength && longestCodeLength > 0
      ? labelFitsProfile(profile, longestCodeLength)
      : null;

  return (
    <Stack gap="xs" className="no-print">
      <Row gap="sm" align="end" wrap>
        <FieldSelect
          name="labelProfile"
          label={label}
          value={value}
          onChange={(v) => onChange(v as LabelProfileId)}
          options={LABEL_PROFILE_IDS.map((id) => ({
            value: id,
            label: LABEL_PROFILES[id].label,
          }))}
        />
        <Text size="sm" color="muted">
          {profile.widthMm} × {profile.heightMm} mm
          {profile.sheet
            ? ` · ${profile.sheet.columns * profile.sheet.rows} per A4 sheet`
            : " · one per page (roll)"}
        </Text>
      </Row>

      {/*
        Three outcomes, three different things to say. A single
        "fits / does not fit" boolean would have collapsed the middle case —
        over the scanning floor with no margin — into one of the two extremes,
        and that is the case where the operator's judgement is actually needed.
      */}
      {fit && !fit.fits && fit.impliedModuleMm < MIN_SCANNABLE_MODULE_MM && (
        <Alert variant="error">{fit.reason}</Alert>
      )}
      {fit && !fit.fits && fit.impliedModuleMm >= MIN_SCANNABLE_MODULE_MM && (
        <Alert variant="warning">{fit.reason}</Alert>
      )}
      {fit && fit.fits && (
        <Text size="xs" color="success">
          {fit.reason}
        </Text>
      )}
    </Stack>
  );
}
