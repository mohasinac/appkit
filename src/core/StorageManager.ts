/**
 * StorageManager Class — @mohasinac/core
 *
 * Singleton class for managing localStorage and sessionStorage with
 * namespace prefixing and SSR-safe fallbacks.
 * Pure utility — no framework or app-specific imports.
 */

import { Logger } from "./Logger";

const sLogger = Logger.getInstance();

export type StorageType = "local" | "session";

export interface StorageOptions {
  type?: StorageType;
  prefix?: string;
}

export class StorageManager {
  /** Per-prefix instance map — prevents namespace collisions */
  private static instances = new Map<string, StorageManager>();
  private readonly prefix: string;

  private constructor(prefix: string = "app_") {
    this.prefix = prefix;
  }

  /**
   * Get-or-create a StorageManager for the given prefix.
   * Each prefix returns an independent instance.
   */
  public static getInstance(prefix: string = ""): StorageManager {
    if (!StorageManager.instances.has(prefix)) {
      StorageManager.instances.set(prefix, new StorageManager(prefix));
    }
    return StorageManager.instances.get(prefix)!;
  }

  private getStorage(type: StorageType): Storage | null {
    try {
      if (typeof window === "undefined") return null;
      const storage =
        type === "local" ? window.localStorage : window.sessionStorage;
      return storage ?? null;
    } catch {
      return null;
    }
  }

  private generateKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  public set<T>(key: string, value: T, options?: StorageOptions): boolean {
    const storage = this.getStorage(options?.type ?? "local");
    if (!storage) return false;
    try {
      storage.setItem(this.generateKey(key), JSON.stringify(value));
      return true;
    } catch (error) {
      sLogger.error("StorageManager.set error", { error });
      return false;
    }
  }

  public get<T>(key: string, options?: StorageOptions): T | null {
    const storage = this.getStorage(options?.type ?? "local");
    if (!storage) return null;
    try {
      const item = storage.getItem(this.generateKey(key));
      if (item === null) return null;
      return JSON.parse(item) as T;
    } catch (error) {
      sLogger.error("StorageManager.get error", { error });
      return null;
    }
  }

  public remove(key: string, options?: StorageOptions): boolean {
    const storage = this.getStorage(options?.type ?? "local");
    if (!storage) return false;
    try {
      storage.removeItem(this.generateKey(key));
      return true;
    } catch (error) {
      sLogger.error("StorageManager.remove error", { error });
      return false;
    }
  }

  public clear(options?: StorageOptions): boolean {
    const storage = this.getStorage(options?.type ?? "local");
    if (!storage) return false;
    try {
      const keys = Object.keys(storage);
      keys.forEach((k) => {
        if (k.startsWith(this.prefix)) storage.removeItem(k);
      });
      return true;
    } catch (error) {
      sLogger.error("StorageManager.clear error", { error });
      return false;
    }
  }

  public has(key: string, options?: StorageOptions): boolean {
    return this.get(key, options) !== null;
  }

  public keys(options?: StorageOptions): string[] {
    const storage = this.getStorage(options?.type ?? "local");
    if (!storage) return [];
    const result: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k?.startsWith(this.prefix)) {
        result.push(k.slice(this.prefix.length));
      }
    }
    return result;
  }

  public size(options?: StorageOptions): number {
    const storage = this.getStorage(options?.type ?? "local");
    if (!storage) return 0;
    let bytes = 0;
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k?.startsWith(this.prefix)) {
        const v = storage.getItem(k);
        bytes += k.length + (v?.length ?? 0);
      }
    }
    return bytes;
  }

  public isAvailable(type: StorageType = "local"): boolean {
    const storage = this.getStorage(type);
    if (!storage) return false;
    try {
      const testKey = "__storage_test__";
      storage.setItem(testKey, "1");
      storage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  public getAll<T = unknown>(options?: StorageOptions): Record<string, T> {
    const storage = this.getStorage(options?.type ?? "local");
    if (!storage) return {};
    const result: Record<string, T> = {};
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k?.startsWith(this.prefix)) {
        const v = this.get<T>(k.slice(this.prefix.length), options);
        if (v !== null) result[k.slice(this.prefix.length)] = v;
      }
    }
    return result;
  }
}

/** Default StorageManager instance (empty prefix) */
export const storageManager = StorageManager.getInstance("");
