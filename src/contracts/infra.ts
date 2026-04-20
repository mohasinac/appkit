// --- Infra Interfaces ---------------------------------------------------------

/**
 * Key-value cache adapter contract.
 * Implemented by @mohasinac/core (in-memory), Redis, Upstash.
 */
export interface ICacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(prefix?: string): Promise<void>;
  has(key: string): Promise<boolean>;
}

export interface QueueJob<T = unknown> {
  id: string;
  type: string;
  payload: T;
  attempts: number;
  maxAttempts: number;
  scheduledAt: string; // ISO-8601
}

/**
 * Background job queue adapter contract.
 * Implemented by @mohasinac/core (in-memory), BullMQ, Upstash QStash.
 */
export interface IQueueProvider {
  enqueue<T>(
    type: string,
    payload: T,
    options?: { delayMs?: number; maxAttempts?: number },
  ): Promise<QueueJob<T>>;
  process<T>(type: string, handler: (job: QueueJob<T>) => Promise<void>): void;
  cancel(jobId: string): Promise<void>;
  getJob<T>(jobId: string): Promise<QueueJob<T> | null>;
}

export type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

/**
 * In-process event bus contract.
 * Implemented by @mohasinac/core (EventEmitter-based).
 */
export interface IEventBus {
  on<T>(event: string, handler: EventHandler<T>): void;
  off<T>(event: string, handler: EventHandler<T>): void;
  emit<T>(event: string, payload: T): void;
  once<T>(event: string, handler: EventHandler<T>): void;
}
