import React from "react";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSeparator,
  DropdownTrigger,
  type DropdownMenuItem as MenuListItem,
} from "./Dropdown";

export interface MenuProps {
  trigger?: React.ReactNode;
  items?: MenuListItem[];
  align?: "left" | "right";
  className?: string;
  menuClassName?: string;
  children?: React.ReactNode;
}

export function Menu(props: MenuProps) {
  return <Dropdown {...props} />;
}

export function MenuTrigger({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <DropdownTrigger className={className}>{children}</DropdownTrigger>;
}

export function MenuContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <DropdownMenu className={className}>{children}</DropdownMenu>;
}

export function MenuItem(props: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return <DropdownItem {...props} />;
}

export function MenuSeparator({ className }: { className?: string }) {
  return <DropdownSeparator className={className} />;
}

export default Menu;
