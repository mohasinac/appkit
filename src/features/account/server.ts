/**
 * @mohasinac/appkit/features/account/server
 *
 * Server-only entry point for account repositories.
 */
export * from "./actions";

export { AccountRepository } from "./repository/account.repository";
// SB-UNI-A 2026-05-13 — AddressRepository deleted. Use addressesRepository
// (top-level addresses collection with ownerType:"user").
export {
  AddressesRepository,
  addressesRepository,
} from "../addresses";
