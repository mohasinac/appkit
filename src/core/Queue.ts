/**
 * Queue Class — @mohasinac/core
 *
 * Generic priority queue for task management.
 * Pure utility — no framework or app-specific imports.
 */

import { Logger } from "./Logger";

const qLogger = Logger.getInstance();

export interface QueueOptions {
  concurrency?: number;
  autoStart?: boolean;
}

export interface Task<T = unknown> {
  id: string;
  fn: () => Promise<T>;
  priority?: number;
}

export class Queue<T = unknown> {
  private tasks: Task<T>[] = [];
  private running: number = 0;
  private readonly concurrency: number;
  private autoStart: boolean;
  private results: Map<string, T> = new Map();
  private errors: Map<string, Error> = new Map();

  constructor(options?: QueueOptions) {
    this.concurrency = options?.concurrency ?? 1;
    this.autoStart = options?.autoStart ?? true;
  }

  /** Add a task to the queue */
  public add(id: string, fn: () => Promise<T>, priority: number = 0): void {
    this.tasks.push({ id, fn, priority });
    this.tasks.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    if (this.autoStart) {
      this.process();
    }
  }

  private process(): void {
    while (this.running < this.concurrency && this.tasks.length > 0) {
      const task = this.tasks.shift();
      if (!task) break;
      this.running++;
      task
        .fn()
        .then((result) => {
          this.results.set(task.id, result);
        })
        .catch((error: unknown) => {
          this.errors.set(task.id, error as Error);
        })
        .finally(() => {
          this.running--;
          this.process();
        })
        .catch((err: unknown) => {
          qLogger.error("Queue.process error in finally", { err });
        });
    }
  }

  public start(): void {
    this.process();
  }

  public pause(): void {
    this.autoStart = false;
  }

  public resume(): void {
    this.autoStart = true;
    this.process();
  }

  public clear(): void {
    this.tasks = [];
    this.results.clear();
    this.errors.clear();
  }

  public getResult(id: string): T | undefined {
    return this.results.get(id);
  }

  public getError(id: string): Error | undefined {
    return this.errors.get(id);
  }

  public size(): number {
    return this.tasks.length;
  }

  public getRunning(): number {
    return this.running;
  }

  public isEmpty(): boolean {
    return this.tasks.length === 0 && this.running === 0;
  }

  public async waitForCompletion(): Promise<void> {
    while (!this.isEmpty()) {
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
    }
  }

  public getStats(): {
    pending: number;
    running: number;
    completed: number;
    failed: number;
  } {
    return {
      pending: this.tasks.length,
      running: this.running,
      completed: this.results.size,
      failed: this.errors.size,
    };
  }
}
