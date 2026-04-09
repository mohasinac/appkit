import type { IAuthProvider, ISessionProvider } from "./auth.js";
import type { IEmailProvider } from "./email.js";
import type { IStorageProvider } from "./storage.js";
import type { IPaymentProvider } from "./payment.js";
import type { IShippingProvider } from "./shipping.js";
import type { ISearchProvider } from "./search.js";
import type { ICacheProvider, IQueueProvider, IEventBus } from "./infra.js";
import type { IStyleAdapter } from "./style.js";
import type { IDbProvider } from "./repository.js";

export interface ProviderRegistry {
  auth: IAuthProvider;
  session: ISessionProvider;
  email: IEmailProvider;
  storage: IStorageProvider;
  style: IStyleAdapter;
  db?: IDbProvider;
  payment?: IPaymentProvider;
  shipping?: IShippingProvider;
  search?: ISearchProvider;
  cache?: ICacheProvider;
  queue?: IQueueProvider;
  eventBus?: IEventBus;
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