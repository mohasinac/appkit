/**
 * API Endpoint Resolver — @mohasinac/appkit
 *
 * Resolves an endpoint key from `API_ENDPOINTS` with optional consumer override.
 * Hooks call `resolveEndpoint(API_ENDPOINTS.AUTH.ME, options?.endpoint)` so
 * they always have a typed default but remain fully overridable by consumers.
 *
 * @example
 * ```ts
 * const url = resolveEndpoint(API_ENDPOINTS.AUTH.ME, options?.authMeEndpoint);
 * ```
 */

/**
 * Returns `override` if it is a non-empty string, otherwise returns `defaultEndpoint`.
 *
 * This is the canonical pattern for hooks that expose an optional endpoint override:
 * ```ts
 * const url = resolveEndpoint(API_ENDPOINTS.AUTH.ME, options?.endpoint);
 * ```
 */
export function resolveEndpoint(
  defaultEndpoint: string,
  override?: string,
): string {
  return override?.trim() ? override.trim() : defaultEndpoint;
}

/**
 * Resolves a parameterized endpoint builder with an optional consumer override.
 *
 * @example
 * ```ts
 * const url = resolveEndpointFn(
 *   API_ENDPOINTS.ACCOUNT.BY_ID,
 *   userId,
 *   options?.accountEndpoint,
 * );
 * ```
 */
export function resolveEndpointFn<TArg>(
  defaultBuilder: (arg: TArg) => string,
  arg: TArg,
  overrideBuilder?: (arg: TArg) => string,
): string {
  return overrideBuilder ? overrideBuilder(arg) : defaultBuilder(arg);
}
