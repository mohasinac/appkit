"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, IndianRupee, UserX, CreditCard, Package, UserCheck, ShieldAlert, Truck } from "lucide-react";
import { Div, Modal, Stack, Row, Heading, Text, Checkbox } from "../../../ui";
import { apiClient } from "../../../http";
import { ACCOUNT_ENDPOINTS } from "../../../constants/api-endpoints";
import { SCAM_CATEGORIES } from "../constants/scam-types";
import { ROUTES } from "../../../next/routing/route-map";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  price_manipulation: <IndianRupee className="h-5 w-5" />,
  social_engineering: <UserX className="h-5 w-5" />,
  payment_fraud: <CreditCard className="h-5 w-5" />,
  preorder_delivery_fraud: <Package className="h-5 w-5" />,
  identity_impersonation: <UserCheck className="h-5 w-5" />,
  item_authenticity_fraud: <ShieldAlert className="h-5 w-5" />,
  logistics_fraud: <Truck className="h-5 w-5" />,
};

export interface ScamAwarenessModalProps {
  isOpen: boolean;
  onAcknowledged: () => void;
}

export function ScamAwarenessModal({ isOpen, onAcknowledged }: ScamAwarenessModalProps) {
  const [checked, setChecked] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.patch(ACCOUNT_ENDPOINTS.PROFILE, { acknowledgeScamAwareness: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      onAcknowledged();
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      showCloseButton={false}
      size="lg"
      title={
        <Row gap="sm" align="center">
          <Shield className="h-5 w-5 text-[color:var(--appkit-color-warning,theme(colors.amber.500))]" />
          <span>Before you start — Stay Safe on LetItRip</span>
        </Row>
      }
      actions={
        <Row gap="sm" justify="end" className="w-full">
          <button
            className="appkit-button appkit-button--primary appkit-button--md"
            disabled={!checked || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Saving…" : "Continue to LetItRip →"}
          </button>
        </Row>
      }
    >
      <Stack gap="md">
        <Text variant="secondary" className="text-sm">
          LetItRip connects you with verified sellers, but collectibles markets attract scams.
          Take 60 seconds to learn the most common patterns — it could save your money.
        </Text>

        {/* Category cards */}
        <Div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SCAM_CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className="flex gap-3 rounded-lg border border-[color:var(--appkit-color-border,theme(colors.zinc.200))] bg-[color:var(--appkit-color-surface,theme(colors.zinc.50))] p-3"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[color:var(--appkit-color-warning,theme(colors.amber.500))]/10 text-[color:var(--appkit-color-warning,theme(colors.amber.600))]">
                {CATEGORY_ICONS[cat.id] ?? <Shield className="h-4 w-4" />}
              </span>
              <Stack gap="none">
                <Text weight="semibold" className="text-sm">
                  {cat.label}
                </Text>
                <Text variant="secondary" className="text-xs leading-relaxed">
                  {cat.description}
                </Text>
              </Stack>
            </div>
          ))}
        </Div>

        {/* Links */}
        <Row gap="md" className="flex-wrap text-sm">
          <a
            href={String(ROUTES.PUBLIC.SCAM_TYPES)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--appkit-color-primary,theme(colors.blue.600))] hover:underline"
          >
            See all 27 scam types →
          </a>
          <a
            href={String(ROUTES.PUBLIC.SCAM_FAQS)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--appkit-color-primary,theme(colors.blue.600))] hover:underline"
          >
            Common scam FAQs →
          </a>
        </Row>

        {mutation.isError && (
          <Text variant="error" className="text-sm">
            Something went wrong — please try again.
          </Text>
        )}

        {/* Acknowledgement checkbox */}
        <Checkbox
          id="scam-awareness-ack"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          label="I have read the above and understand the risks of buying and selling collectibles online."
        />
      </Stack>
    </Modal>
  );
}
