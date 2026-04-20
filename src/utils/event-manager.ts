/**
 * Event Manager Utilities
 *
 * Centralized DOM event handler management, throttle/debounce,
 * and viewport / scroll / body-scroll utilities.
 */

interface EventHandlerRecord {
  type: string;
  target: EventTarget;
  callback: EventListener;
  options?: AddEventListenerOptions;
}

export class GlobalEventManager {
  private handlers: Map<string, EventHandlerRecord[]> = new Map();
  private handlerIds: Map<string, number> = new Map();

  private generateId(type: string, target: EventTarget): string {
    const targetId = this.getTargetId(target);
    const key = `${type}-${targetId}`;
    const count = (this.handlerIds.get(key) ?? 0) + 1;
    this.handlerIds.set(key, count);
    return `${key}-${count}`;
  }

  private getTargetId(target: EventTarget): string {
    if (target === window) return "window";
    if (target === document) return "document";
    if (target instanceof HTMLElement && target.id) return target.id;
    return `element-${crypto.randomUUID()}`;
  }

  add(
    target: EventTarget,
    type: string,
    callback: EventListener,
    options?: AddEventListenerOptions,
  ): string {
    const id = this.generateId(type, target);
    if (!this.handlers.has(id)) this.handlers.set(id, []);
    this.handlers.get(id)!.push({ type, target, callback, options });
    target.addEventListener(type, callback, options);
    return id;
  }

  remove(id: string): void {
    const handlers = this.handlers.get(id);
    if (!handlers) return;
    handlers.forEach(({ type, target, callback, options }) =>
      target.removeEventListener(type, callback, options),
    );
    this.handlers.delete(id);
  }

  removeAllForTarget(target: EventTarget, type?: string): void {
    const toRemove: string[] = [];
    this.handlers.forEach((handlers, id) => {
      const matchesTarget = handlers.some((h) => h.target === target);
      const matchesType = !type || handlers.some((h) => h.type === type);
      if (matchesTarget && matchesType) toRemove.push(id);
    });
    toRemove.forEach((id) => this.remove(id));
  }

  clear(): void {
    this.handlers.forEach((handlers) =>
      handlers.forEach(({ type, target, callback, options }) =>
        target.removeEventListener(type, callback, options),
      ),
    );
    this.handlers.clear();
    this.handlerIds.clear();
  }

  getHandlerCount(): number {
    return this.handlers.size;
  }
  has(id: string): boolean {
    return this.handlers.has(id);
  }
}

export const globalEventManager = new GlobalEventManager();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastRun = 0;
  return (...args: Parameters<T>): void => {
    const now = Date.now();
    if (now - lastRun >= delay) {
      func(...args);
      lastRun = now;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(
        () => {
          func(...args);
          lastRun = Date.now();
        },
        delay - (now - lastRun),
      );
    }
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>): void => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export function addGlobalScrollHandler(
  callback: (event: Event) => void,
  options?: { throttle?: number; target?: EventTarget },
): string {
  const { throttle: throttleDelay = 100, target = window } = options ?? {};
  const handler =
    throttleDelay > 0 ? throttle(callback, throttleDelay) : callback;
  return globalEventManager.add(target, "scroll", handler as EventListener, {
    passive: true,
  });
}

export function addGlobalResizeHandler(
  callback: (event: Event) => void,
  options?: { throttle?: number },
): string {
  const { throttle: throttleDelay = 200 } = options ?? {};
  const handler =
    throttleDelay > 0 ? throttle(callback, throttleDelay) : callback;
  return globalEventManager.add(window, "resize", handler as EventListener);
}

export function addGlobalClickHandler(
  selector: string,
  callback: (event: MouseEvent, element: Element) => void,
  options?: { preventDefault?: boolean },
): string {
  const handler = (event: Event) => {
    const element = (event.target as Element).closest(selector);
    if (element) {
      if (options?.preventDefault) event.preventDefault();
      callback(event as MouseEvent, element);
    }
  };
  return globalEventManager.add(document, "click", handler as EventListener);
}

export function addGlobalKeyHandler(
  key: string | string[],
  callback: (event: KeyboardEvent) => void,
  options?: {
    preventDefault?: boolean;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
  },
): string {
  const keys = Array.isArray(key) ? key : [key];
  const {
    preventDefault = false,
    ctrl = false,
    shift = false,
    alt = false,
    meta = false,
  } = options ?? {};
  const handler = (event: Event) => {
    const e = event as KeyboardEvent;
    if (!keys.some((k) => e.key === k || e.code === k)) return;
    if (
      e.ctrlKey !== ctrl ||
      e.shiftKey !== shift ||
      e.altKey !== alt ||
      e.metaKey !== meta
    )
      return;
    if (preventDefault) event.preventDefault();
    callback(e);
  };
  return globalEventManager.add(document, "keydown", handler as EventListener);
}

export function removeGlobalHandler(id: string): void {
  globalEventManager.remove(id);
}
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}
export function hasTouchSupport(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}
export function getViewportDimensions(): { width: number; height: number } {
  if (typeof window === "undefined") return { width: 0, height: 0 };
  return {
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight,
  };
}
export function isInViewport(element: HTMLElement, offset = 0): boolean {
  if (typeof window === "undefined") return false;
  const rect = element.getBoundingClientRect();
  const { width, height } = getViewportDimensions();
  return (
    rect.top >= -offset &&
    rect.left >= -offset &&
    rect.bottom <= height + offset &&
    rect.right <= width + offset
  );
}
export function smoothScrollTo(
  element: HTMLElement | string,
  options?: { offset?: number },
): void {
  const target =
    typeof element === "string" ? document.querySelector(element) : element;
  if (!target) return;
  const { offset = 0 } = options ?? {};
  window.scrollTo({
    top:
      (target as HTMLElement).getBoundingClientRect().top +
      window.pageYOffset -
      offset,
    behavior: "smooth",
  });
}
export function preventBodyScroll(prevent: boolean): void {
  if (typeof document === "undefined") return;
  if (prevent) {
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;
  } else {
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
  }
}
