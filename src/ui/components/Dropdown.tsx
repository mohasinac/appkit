"use client"
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const UI_DROPDOWN = {
  root: "appkit-dropdown",
  menu: "appkit-dropdown__menu",
  menuLeft: "appkit-dropdown__menu--left",
  menuRight: "appkit-dropdown__menu--right",
  item: "appkit-dropdown__item",
  itemActive: "appkit-dropdown__item--active",
  itemDestructive: "appkit-dropdown__item--destructive",
  composedMenu: "appkit-dropdown__composed-menu",
  composedItem: "appkit-dropdown__composed-item",
  separator: "appkit-dropdown__separator",
  trigger: "appkit-dropdown__trigger",
} as const;

export interface DropdownMenuItem {
  id?: string;
  label: React.ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

export interface DropdownProps {
  trigger?: React.ReactNode;
  items?: DropdownMenuItem[];
  align?: "left" | "right";
  className?: string;
  menuClassName?: string;
  children?: React.ReactNode;
}

interface DropdownContextValue {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  close: () => void;
}

const DropdownContext = createContext<DropdownContextValue>({
  isOpen: false,
  setIsOpen: () => {},
  close: () => {},
});

export function Dropdown({
  trigger,
  items,
  align = "right",
  className = "",
  menuClassName = "",
  children,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemCount = items?.length ?? 0;

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const menuItems = useMemo(() => items ?? [], [items]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isOpen) {
      if (
        event.key === "ArrowDown" ||
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (!itemCount) {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % itemCount);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + itemCount) % itemCount);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(itemCount - 1);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      buttonRef.current?.focus();
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const activeItem = menuItems[activeIndex];
      if (activeItem && !activeItem.disabled) {
        activeItem.onSelect?.();
        setIsOpen(false);
      }
    }
  };

  return (
    <DropdownContext.Provider
      value={{ isOpen, setIsOpen, close: () => setIsOpen(false) }}
    >
      <div
        ref={containerRef}
        className={[UI_DROPDOWN.root, className].filter(Boolean).join(" ")}
        onKeyDown={onKeyDown}
        onClick={() = data-section="dropdown-div-486"> {
          if (trigger) return;
          setIsOpen((prev) => !prev);
        }}
      >
        {trigger ? (
          <button
            ref={buttonRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={isOpen}
            onClick={() => {
              setIsOpen((prev) => !prev);
              setActiveIndex(0);
            }}
          >
            {trigger}
          </button>
        ) : null}

        {children}

        {isOpen && menuItems.length > 0 ? (
          <div
            role="menu"
            className={[
              UI_DROPDOWN.menu,
              align === "left" ? UI_DROPDOWN.menuLeft : UI_DROPDOWN.menuRight,
              menuClassName,
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={(event) = data-section="dropdown-div-487"> event.stopPropagation()}
          >
            {menuItems.map((item, index) => {
              const isActive = index === activeIndex;
              const isDisabled = Boolean(item.disabled);
              return (
                <button
                  key={item.id ?? `${String(item.label)}-${index}`}
                  role="menuitem"
                  type="button"
                  disabled={isDisabled}
                  className={[
                    UI_DROPDOWN.item,
                    isActive ? UI_DROPDOWN.itemActive : "",
                    item.destructive ? UI_DROPDOWN.itemDestructive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    if (isDisabled) return;
                    item.onSelect?.();
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownTrigger({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={[UI_DROPDOWN.trigger, className ?? ""].join(" ")} data-section="dropdown-div-488">
      {children}
    </div>
  );
}

export function DropdownMenu({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { isOpen } = useContext(DropdownContext);
  if (!isOpen) return null;

  return (
    <div
      role="menu"
      className={[UI_DROPDOWN.composedMenu, className ?? ""].join(" ")}
      onClick={(event) = data-section="dropdown-div-489"> event.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const { close } = useContext(DropdownContext);

  return (
    <button
      type="button"
      disabled={disabled}
      className={[UI_DROPDOWN.composedItem, className ?? ""].join(" ")}
      onClick={() => {
        onClick?.();
        close();
      }}
    >
      {children}
    </button>
  );
}

export function DropdownSeparator({ className }: { className?: string }) {
  return <div className={[UI_DROPDOWN.separator, className ?? ""].join(" ")} />;
}

export default Dropdown;
