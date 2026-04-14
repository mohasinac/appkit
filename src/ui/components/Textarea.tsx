import React from "react";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className = "", ...props }: TextareaProps) {
  return (
    <textarea
      className={["appkit-textarea", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
