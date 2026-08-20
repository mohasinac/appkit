"use client"
import { useEffect, useRef } from "react";
import {
  useBottomActionsContext,
  type BottomAction,
  type BottomBulkConfig,
} from "../BottomActionsContext";

export interface UseBottomActionsOptions {
  actions?: BottomAction[];
  bulk?: BottomBulkConfig;
  infoLabel?: string;
  /** Rendered as its own row above infoLabel. See BottomActionsState.secondaryLabel. */
  secondaryLabel?: string;
}

export function useBottomActions(options: UseBottomActionsOptions = {}) {
  const { setActions, setBulkConfig, setInfoLabel, setSecondaryLabel, clearAll } =
    useBottomActionsContext();

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

  useEffect(() => {
    return () => clearAll();
  }, [clearAll]);
}
