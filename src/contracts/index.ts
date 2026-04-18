// @mohasinac/contracts
// Pure TypeScript interfaces and shared types — no concrete code.
// Every other @mohasinac/* package depends on this package.

// Repository
export type {
  WhereOp,
  SieveQuery,
  PagedResult,
  IReadRepository,
  IWriteRepository,
  IRepository,
  IRealtimeRepository,
  IDbProvider,
} from "./repository";

// Auth
export type {
  AuthPayload,
  AuthUser,
  CreateUserInput,
  IAuthProvider,
  ISessionProvider,
} from "./auth";

// Email
export type {
  EmailAttachment,
  EmailOptions,
  EmailResult,
  IEmailProvider,
} from "./email";

// Storage
export type { UploadOptions, StorageFile, IStorageProvider } from "./storage";

// Payment
export type {
  PaymentOrder,
  PaymentCapture,
  Refund,
  IPaymentProvider,
} from "./payment";

// Shipping
export type {
  ShippingAddress,
  CreateShipmentInput,
  Shipment,
  TrackingEvent,
  TrackingInfo,
  ServiceabilityResult,
  IShippingProvider,
} from "./shipping";

// Search
export type {
  SearchOptions,
  SearchHit,
  SearchResult,
  SuggestOptions,
  ISearchProvider,
} from "./search";

// Infra (Cache, Queue, EventBus)
export type {
  ICacheProvider,
  QueueJob,
  IQueueProvider,
  EventHandler,
  IEventBus,
} from "./infra";

// Style
export type { IStyleAdapter } from "./style";

// Registry
export type { ProviderRegistry } from "./registry";
export { registerProviders, getProviders, _resetProviders } from "./registry";

// Repository lifecycle hooks
export type { RepositoryLifecycleHooks } from "./repository";
export {
  setCollectionHooks,
  getCollectionHooks,
  removeCollectionHooks,
  _resetCollectionHooks,
} from "./repository";

// Form field registry
export type { ExtraFormField, ExtraFieldRenderArgs } from "./form";
export {
  registerFormFields,
  resolveFormFields,
  removeFormFields,
  _resetFormFields,
} from "./form";

// Feature manifest
export type {
  RouteStub,
  ApiRouteStub,
  FeatureManifest,
  FeaturesConfig,
} from "./feature";

// Site config
export type { SiteConfig, NavItem } from "./config";

// Extensibility utilities
export type {
  WithTransformOpts,
  GenericListResponse,
  TableColumn,
  ColumnExtensionOpts,
  LayoutSlots,
  FeatureExtension,
} from "./extend";

// Table / Pagination / Sticky config
export type {
  PaginationConfig,
  StickyConfig,
  TableConfig,
  TableViewMode,
} from "./table";
export {
  DEFAULT_PAGINATION_CONFIG,
  DEFAULT_STICKY_CONFIG,
  DEFAULT_TABLE_CONFIG,
  mergeTableConfig,
} from "./table";

// Field operations (source-agnostic sentinels)
export type { IFieldOps, FieldSentinel } from "./field-ops";
export {
  registerFieldOps,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  deleteField,
} from "./field-ops";

// Client-side realtime provider
export type {
  RealtimeSnapshot,
  Unsubscribe,
  IClientRealtimeProvider,
} from "./client-realtime";
export {
  registerClientRealtimeProvider,
  getClientRealtimeProvider,
} from "./client-realtime";

// Client-side auth provider
export type { IClientAuthProvider } from "./client-auth";
export {
  registerClientAuthProvider,
  getClientAuthProvider,
} from "./client-auth";

// Client-side session adapter
export type {
  AdapterAuthUser,
  AuthUnsubscribe,
  IClientSessionAdapter,
} from "./client-session";
export {
  registerClientSessionAdapter,
  getClientSessionAdapter,
} from "./client-session";

// Composable filter/sort builder
export type {
  FilterOption,
  FilterType,
  FilterDefinition,
  SortDefinition,
} from "./extend";
export { mergeFilterDefinitions, mergeSortDefinitions } from "./extend";

// Client-side payment gateway
export type {
  GatewayPaymentResponse,
  OpenGatewayOptions,
  IClientPaymentGateway,
} from "./client-payment-gateway";
export {
  registerClientPaymentGateway,
  getClientPaymentGateway,
  getRegisteredPaymentGateways,
} from "./client-payment-gateway";
