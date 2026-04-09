/**
 * EventBus Class — @mohasinac/core
 *
 * Singleton pub/sub event bus for decoupled communication.
 * Pure utility — no framework or app-specific imports.
 */

import { Logger } from "./Logger";

const logger = Logger.getInstance();

type EventCallback = (...args: unknown[]) => void;

export interface EventSubscription {
  unsubscribe: () => void;
}

export class EventBus {
  private static instance: EventBus;
  private readonly events: Map<string, EventCallback[]> = new Map();

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public on(event: string, callback: EventCallback): EventSubscription {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
    return { unsubscribe: () => this.off(event, callback) };
  }

  public once(event: string, callback: EventCallback): EventSubscription {
    const wrapped = (...args: unknown[]) => {
      callback(...args);
      this.off(event, wrapped);
    };
    return this.on(event, wrapped);
  }

  public off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event);
    if (!callbacks) return;
    const idx = callbacks.indexOf(callback);
    if (idx > -1) callbacks.splice(idx, 1);
    if (callbacks.length === 0) this.events.delete(event);
  }

  public emit(event: string, ...args: unknown[]): void {
    const callbacks = this.events.get(event);
    if (!callbacks) return;
    callbacks.forEach((cb) => {
      try {
        cb(...args);
      } catch (error) {
        logger.error(`EventBus: error in handler for "${event}"`, { error });
      }
    });
  }

  public removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  public listenerCount(event: string): number {
    return this.events.get(event)?.length ?? 0;
  }

  public eventNames(): string[] {
    return Array.from(this.events.keys());
  }

  public hasListeners(event: string): boolean {
    return this.listenerCount(event) > 0;
  }
}

/** Shared singleton instance */
export const eventBus = EventBus.getInstance();
