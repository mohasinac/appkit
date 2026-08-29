"use client"
import type React from "react";
import { useEffect, useId, useRef } from "react";
import {
  useBottomActionsContext,
  type BottomAction,
  type BottomActionsDesktopMode,
  type BottomBulkConfig,
} from "../BottomActionsContext";

export interface UseBottomActionsOptions {
  actions?: BottomAction[];
  bulk?: BottomBulkConfig;
  infoLabel?: string;
  /** Rendered as its own row above infoLabel. See BottomActionsState.secondaryLabel. */
  secondaryLabel?: string;
  /**
   * Expandable detail revealed above the bar when the infoLabel row is tapped.
   * See BottomActionsState.infoPanel.
   */
  infoPanel?: React.ReactNode;
  /** Bump to force `infoPanel` open once. See BottomActionsState.infoOpenSignal. */
  infoOpenSignal?: number;
  /**
   * Whether the bar may also show on desktop. Defaults to "hidden" (mobile/tablet only),
   * so pages that don't opt in behave exactly as before.
   */
  desktop?: BottomActionsDesktopMode;
  /**
   * Set false to opt out entirely — no claim is taken, so this consumer is
   * invisible to the stack and cannot displace whoever currently owns the
   * bar. Load-bearing: `useFormBottomActions` is called unconditionally from
   * `<Form>`, which mounts on ~75 surfaces, and a claim from each of those
   * would push a listing's bulk bar off the stack for nothing.
   */
  enabled?: boolean;
}

export function useBottomActions(options: UseBottomActionsOptions = {}) {
  const {
    setActions,
    setBulkConfig,
    setInfoLabel,
    setSecondaryLabel,
    setInfoPanel,
    setInfoOpenSignal,
    setDesktopMode,
    claim,
    release,
    topClaimId,
  } = useBottomActionsContext();

  /*
   * One bar, many potential claimants. `DataListingView` already holds it on
   * ~70 admin screens, so a form opened in a drawer over a listing used to
   * overwrite the listing's bar and blank it on close.
   *
   * Claim on mount, release on unmount. `isTop` gates every publish below, so
   * a backgrounded consumer stops writing — and because `isTop` is a
   * dependency of each effect, regaining the top re-publishes everything
   * automatically. That is what restores the listing's bar when the form
   * closes, with no cooperation needed from either side.
   */
  const enabled = options.enabled !== false;
  const claimId = useId();
  useEffect(() => {
    if (!enabled) return;
    claim(claimId);
    return () => release(claimId);
  }, [claim, release, claimId, enabled]);
  const isTop = enabled && topClaimId === claimId;

  const actionsRef = useRef(options.actions ?? []);
  actionsRef.current = options.actions ?? [];

  const bulkRef = useRef(options.bulk);
  bulkRef.current = options.bulk;

  const actionKey = (options.actions ?? [])
    .map(
      ({ id, label, variant, badge, disabled, loading }) =>
        `${id}|${label}|${variant}|${badge}|${disabled}|${loading}`,
    )
    .join(",");

  const bulkCountKey = options.bulk
    ? `${options.bulk.selectedCount}|${options.bulk.actions.map((a) => `${a.id}|${a.label}|${a.variant}|${a.badge}|${a.disabled}|${a.loading}`).join(",")}`
    : "";

  useEffect(() => {
    if (!isTop) return;
    setActions(actionsRef.current);
  }, [setActions, actionKey, isTop]);

  useEffect(() => {
    if (!isTop) return;
    setBulkConfig(bulkRef.current);
  }, [setBulkConfig, bulkCountKey, isTop]);

  useEffect(() => {
    if (!isTop) return;
    setInfoLabel(options.infoLabel);
  }, [setInfoLabel, options.infoLabel, isTop]);

  useEffect(() => {
    if (!isTop) return;
    setSecondaryLabel(options.secondaryLabel);
  }, [setSecondaryLabel, options.secondaryLabel, isTop]);

  // A ReactNode is a fresh object on every render, so it can't be a dependency
  // without looping. Mirror it through a ref and re-publish whenever anything
  // the panel actually derives from changes — callers pass `infoLabel`, which
  // moves with the same data the panel shows.
  const infoPanelRef = useRef(options.infoPanel);
  infoPanelRef.current = options.infoPanel;
  const hasInfoPanel = options.infoPanel != null;

  useEffect(() => {
    if (!isTop) return;
    setInfoPanel(infoPanelRef.current);
  }, [setInfoPanel, hasInfoPanel, options.infoLabel, options.secondaryLabel, isTop]);

  useEffect(() => {
    if (!isTop) return;
    setInfoOpenSignal(options.infoOpenSignal);
  }, [setInfoOpenSignal, options.infoOpenSignal, isTop]);

  useEffect(() => {
    if (!isTop) return;
    setDesktopMode(options.desktop);
  }, [setDesktopMode, options.desktop, isTop]);

  // NOTE: no clearAll() on unmount any more — `release()` above owns that, and
  // only blanks the bar when the stack empties. Clearing here would flash an
  // empty bar between a drawer closing and the listing behind it republishing.
}
