import type { IAuthProvider, ISessionProvider } from "./auth";
import type { IEmailProvider } from "./email";
import type { IStorageProvider } from "./storage";
import type { IPaymentProvider } from "./payment";
import type { IShippingProvider } from "./shipping";
import type { ITaxProvider } from "./tax";
import type { ISearchProvider } from "./search";
import type { ICacheProvider, IQueueProvider, IEventBus } from "./infra";
import type { IStyleAdapter } from "./style";
import type { IDbProvider } from "./repository";

export interface IRbacProvider {
  /** Resolve the permission list for a user UID. Admin role returns []. */
  getPermissions: (uid: string) => Promise<string[]>;
  /** True when the user has the admin role (bypasses all permission checks). */
  isAdmin: (uid: string) => Promise<boolean>;
}

export interface ProviderRegistry {
  auth: IAuthProvider;
  session: ISessionProvider;
  email: IEmailProvider;
  storage: IStorageProvider;
  style: IStyleAdapter;
  db?: IDbProvider;
  payment?: IPaymentProvider;
  shipping?: IShippingProvider;
  /**
   * Jurisdiction tax engine. Optional, and defaults to India GST at the call
   * site rather than here — an install that never registers one keeps today's
   * behaviour exactly, which is what makes adopting the seam safe one caller at
   * a time instead of in a single 42-file sweep.
   */
  tax?: ITaxProvider;
  search?: ISearchProvider;
  cache?: ICacheProvider;
  queue?: IQueueProvider;
  eventBus?: IEventBus;
  rbac?: IRbacProvider;
}

let _registry: ProviderRegistry | null = null;

export function registerProviders(registry: ProviderRegistry): void {
  _registry = registry;
}

export function getProviders(): ProviderRegistry {
  if (!_registry) {
    throw new Error(
      "[contracts] Call registerProviders() before getProviders(). " +
        "Ensure providers.config.ts is imported at app startup.",
    );
  }
  return _registry;
}

export function _resetProviders(): void {
  _registry = null;
}