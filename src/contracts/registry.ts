import type { IAuthProvider, ISessionProvider } from "./auth";
import type { IEmailProvider } from "./email";
import type { IStorageProvider } from "./storage";
import type { IPaymentProvider } from "./payment";
import type { IShippingProvider } from "./shipping";
import type { ISearchProvider } from "./search";
import type { ICacheProvider, IQueueProvider, IEventBus } from "./infra";
import type { IStyleAdapter } from "./style";
import type { IDbProvider } from "./repository";

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