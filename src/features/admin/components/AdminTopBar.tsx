"use client";

import React from "react";
import { Div } from "../../../ui";

export interface AdminTopBarProps {
  renderLeft?: () => React.ReactNode;
  renderRight?: () => React.ReactNode;
  renderSearch?: (value: string, onChange: (v: string) => void) => React.ReactNode;
  className?: string;
}

export function AdminTopBar({ renderLeft, renderRight, renderSearch, className = "" }: AdminTopBarProps) {
  const [search, setSearch] = React.useState("");
  return (
    <Div className={className}>
      {renderLeft?.()}
      {renderSearch?.(search, setSearch)}
      {renderRight?.()}
    </Div>
  );
}