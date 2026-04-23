"use client";
import React from "react";
import Link from "next/link";
import { Aside, Div, Li, Nav, Row, Span, Text, Ul } from "../../../ui";
import { BottomSheet } from "../../layout/BottomSheet";

export interface SellerNavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
}

interface SellerSidebarProps {
  items: SellerNavItem[];
  activeHref: string;
  storeName?: string;
  storeLogoURL?: string;
  /** Whether the mobile drawer is open */
  mobileOpen?: boolean;
  /** Called when the mobile drawer should close */
  onCloseMobile?: () => void;
  className?: string;
}

function SellerNavContent({
  items,
  activeHref,
  storeName,
  storeLogoURL,
  onItemClick,
}: Pick<SellerSidebarProps, "items" | "activeHref" | "storeName" | "storeLogoURL"> & {
  onItemClick?: () => void;
}) {
  return (
    <>
      {storeName && (
        <Row gap="3" className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
          {storeLogoURL ? (
            <Div
              role="img"
              aria-label={storeName}
              className="h-8 w-8 rounded-full bg-center bg-cover"
              style={{ backgroundImage: `url(${storeLogoURL})` }}
            />
          ) : (
            <Div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold text-sm">
              {storeName[0]?.toUpperCase()}
            </Div>
          )}
          <Text className="font-semibold text-gray-900 dark:text-zinc-100 text-sm truncate">
            {storeName}
          </Text>
        </Row>
      )}
      <Nav aria-label="Seller navigation" className="flex-1 overflow-y-auto py-3">
        <Ul className="space-y-0.5 px-2">
          {items.map((item) => {
            const isActive = activeHref === item.href;
            return (
              <Li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onItemClick}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-medium"
                      : "text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-zinc-100"
                  }`}
                >
                  {item.icon && (
                    <Span className="shrink-0 text-[1.1rem]">{item.icon}</Span>
                  )}
                  <Span className="flex-1 truncate">{item.label}</Span>
                  {item.badge != null && item.badge > 0 && (
                    <Span className="shrink-0 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {item.badge}
                    </Span>
                  )}
                </Link>
              </Li>
            );
          })}
        </Ul>
      </Nav>
    </>
  );
}

export function SellerSidebar({
  items,
  activeHref,
  storeName,
  storeLogoURL,
  mobileOpen = false,
  onCloseMobile,
  className = "",
}: SellerSidebarProps) {
  return (
    <>
      {/* Desktop sidebar — always visible on md+ */}
      <Aside
        className={`hidden md:flex w-64 shrink-0 flex-col bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 ${className}`}
      >
        <SellerNavContent items={items} activeHref={activeHref} storeName={storeName} storeLogoURL={storeLogoURL} />
      </Aside>

      {/* Mobile: BottomSheet slides up from bottom */}
      <BottomSheet
        open={mobileOpen}
        onClose={onCloseMobile ?? (() => {})}
        title={storeName ?? "Seller Panel"}
      >
        <SellerNavContent items={items} activeHref={activeHref} storeName={storeName} storeLogoURL={storeLogoURL} onItemClick={onCloseMobile} />
      </BottomSheet>
    </>
  );
}
