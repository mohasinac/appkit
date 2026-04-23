"use client"
import React from "react";
import { usePathname } from "next/navigation";
import { Nav } from "./Semantic";
import { Button } from "./Button";
import { Span } from "./Typography";
import { TextLink } from "./TextLink";

export interface SectionTab {
  label: string;
  href?: string;
  value?: string;
  icon?: React.ReactNode;
  count?: number;
}

export interface SectionTabsProps {
  tabs: readonly SectionTab[];
  variant?: "admin" | "user" | "default";
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
  inline?: boolean;
  stickyTopClassName?: string;
  currentPath?: string;
}

export function SectionTabs({
  tabs,
  variant = "default",
  className = "",
  value,
  onChange,
  inline = false,
  stickyTopClassName = "top-12 md:top-[108px]",
  currentPath,
}: SectionTabsProps) {
  const pathname = usePathname();
  const isControlled = typeof onChange === "function";
  const activePath = currentPath ?? pathname ?? "";

  const isActiveTab = (tab: SectionTab): boolean => {
    if (isControlled) {
      return value === (tab.value ?? tab.href ?? "");
    }

    const href = tab.href ?? "";
    if (!href) return false;

    if (href.endsWith("/dashboard") || href.endsWith("/profile")) {
      return activePath === href;
    }
    return activePath.startsWith(href);
  };

  const getTabKey = (tab: SectionTab) => tab.value ?? tab.href ?? tab.label;

  const gradientClass =
    variant === "admin"
      ? "appkit-section-tabs--admin"
      : variant === "user"
        ? "appkit-section-tabs--user"
        : "";

  const tabActiveClass = "appkit-section-tabs__tab--active";
  const tabInactiveClass = "appkit-section-tabs__tab--inactive";
  const tabBaseClass = "appkit-section-tabs__tab";

  const strip = (
    <Nav aria-label="Section navigation" className="appkit-section-tabs__nav">
      <div
        className={[
          "appkit-section-tabs__scroll",
          inline ? "" : "appkit-section-tabs__scroll--padded",
        ]
          .filter(Boolean)
          .join(" ")}
       data-section="sectiontabs-div-587">
        <div
          className={[
            "appkit-section-tabs__track",
            inline ? "" : "appkit-section-tabs__track--full",
          ]
            .filter(Boolean)
            .join(" ")}
         data-section="sectiontabs-div-588">
          {tabs.map((tab) => {
            const key = getTabKey(tab);
            const isActive = isActiveTab(tab);
            const tabClass = `${tabBaseClass} ${isActive ? tabActiveClass : tabInactiveClass}`;

            const content = (
              <>
                {tab.icon && (
                  <Span
                    variant="inherit"
                    className="appkit-section-tabs__icon"
                    aria-hidden
                  >
                    {tab.icon}
                  </Span>
                )}
                {tab.label}
                {tab.count !== undefined && (
                  <Span
                    className={`appkit-section-tabs__count ${
                      isActive
                        ? "appkit-section-tabs__count--active"
                        : "appkit-section-tabs__count--inactive"
                    }`}
                  >
                    {tab.count}
                  </Span>
                )}
              </>
            );

            if (isControlled) {
              return (
                <Button
                  key={key}
                  type="button"
                  variant="ghost"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onChange(tab.value ?? tab.href ?? "")}
                  className={tabClass}
                >
                  {content}
                </Button>
              );
            }

            return (
              <TextLink key={key} href={tab.href ?? "#"} className={tabClass}>
                {content}
              </TextLink>
            );
          })}
        </div>
      </div>
    </Nav>
  );

  if (inline) {
    return <div className={className} data-section="sectiontabs-div-589">{strip}</div>;
  }

  return (
    <div
      className={[
        "appkit-section-tabs",
        stickyTopClassName,
        gradientClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
     data-section="sectiontabs-div-590">
      <div className="appkit-section-tabs__container" data-section="sectiontabs-div-591">{strip}</div>
    </div>
  );
}
