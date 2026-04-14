"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
        className={["relative inline-block", className]
          .filter(Boolean)
          .join(" ")}
        onKeyDown={onKeyDown}
        onClick={() => {
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
              "absolute z-50 mt-2 min-w-[180px] rounded-lg border border-zinc-200",
              "bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900",
              align === "left" ? "left-0" : "right-0",
              menuClassName,
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={(event) => event.stopPropagation()}
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
                    "flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors",
                    isActive ? "bg-zinc-100 dark:bg-slate-800" : "",
                    item.destructive
                      ? "text-red-600 dark:text-red-400"
                      : "text-zinc-700 dark:text-slate-200",
                    isDisabled ? "cursor-not-allowed opacity-50" : "",
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
    <div className={["cursor-pointer", className ?? ""].join(" ")}>
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
      className={[
        "absolute right-0 z-50 mt-1 min-w-[160px] rounded-lg border border-zinc-200",
        "bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900",
        className ?? "",
      ].join(" ")}
      onClick={(event) => event.stopPropagation()}
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
      className={[
        "flex w-full items-center rounded-md px-3 py-2 text-left text-sm",
        "text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800",
        className ?? "",
      ].join(" ")}
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
  return (
    <div
      className={[
        "my-1 border-t border-zinc-200 dark:border-slate-700",
        className ?? "",
      ].join(" ")}
    />
  );
}

export default Dropdown;
