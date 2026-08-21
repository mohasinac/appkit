"use client"
import type React from "react";
import { useEffect, useRef } from "react";
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
  /**
   * Whether the bar may also show on desktop. Defaults to "hidden" (mobile/tablet only),
   * so pages that don't opt in behave exactly as before.
   */
  desktop?: BottomActionsDesktopMode;
}

export function useBottomActions(options: UseBottomActionsOptions = {}) {
  const {
    setActions,
    setBulkConfig,
    setInfoLabel,
    setSecondaryLabel,
    setInfoPanel,
    setDesktopMode,
    clearAll,
  } = useBottomActionsContext();

  const actionsRef = useRef(options.actions ?? []);
  actionsRef.current = options.actions ?? [];

  const bulkRef = useRef(options.bulk);
  bulkRef.current = options.bulk;

  const actionKey = (options.actions ?? [])
    .map(
      ({ id, label, variant, badge, disabled, loading, grow }) =>
        `${id}|${label}|${variant}|${badge}|${disabled}|${loading}|${grow}`,
    )
    .join(",");

  const bulkCountKey = options.bulk
    ? `${options.bulk.selectedCount}|${options.bulk.actions.map((a) => `${a.id}|${a.label}|${a.variant}|${a.badge}|${a.disabled}|${a.loading}|${a.grow}`).join(",")}`
    : "";

  useEffect(() => {
    setActions(actionsRef.current);
  }, [setActions, actionKey]);

  useEffect(() => {
    setBulkConfig(bulkRef.current);
  }, [setBulkConfig, bulkCountKey]);

  useEffect(() => {
    setInfoLabel(options.infoLabel);
  }, [setInfoLabel, options.infoLabel]);

  useEffect(() => {
    setSecondaryLabel(options.secondaryLabel);
  }, [setSecondaryLabel, options.secondaryLabel]);

  // A ReactNode is a fresh object on every render, so it can't be a dependency
  // without looping. Mirror it through a ref and re-publish whenever anything
  // the panel actually derives from changes — callers pass `infoLabel`, which
  // moves with the same data the panel shows.
  const infoPanelRef = useRef(options.infoPanel);
  infoPanelRef.current = options.infoPanel;
  const hasInfoPanel = options.infoPanel != null;

  useEffect(() => {
    setInfoPanel(infoPanelRef.current);
  }, [setInfoPanel, hasInfoPanel, options.infoLabel, options.secondaryLabel]);

  useEffect(() => {
    setDesktopMode(options.desktop);
  }, [setDesktopMode, options.desktop]);

  useEffect(() => {
    return () => clearAll();
  }, [clearAll]);
}
