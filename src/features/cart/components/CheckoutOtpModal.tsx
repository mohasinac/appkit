import React from "react";
import { Div } from "../../../ui";

export interface CheckoutOtpModalProps {
  isOpen: boolean;
  title?: string;
  onClose: () => void;
  renderContainer: (context: {
    isOpen: boolean;
    title?: string;
    onClose: () => void;
    children: React.ReactNode;
  }) => React.ReactNode;
  renderBody: () => React.ReactNode;
  className?: string;
}

export function CheckoutOtpModal({
  isOpen,
  title,
  onClose,
  renderContainer,
  renderBody,
  className = "",
}: CheckoutOtpModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {renderContainer({
        isOpen,
        title,
        onClose,
        children: <Div className={className}>{renderBody()}</Div>,
      })}
    </>
  );
}
