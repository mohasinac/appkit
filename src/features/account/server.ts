/**
 * @mohasinac/appkit/features/account/server
 *
 * Server-only entry point for account repositories.
 */
import "server-only";

export * from "./actions";

export { AccountRepository } from "./repository/account.repository";
export {
  AddressRepository,
  addressRepository,
} from "./repository/address.repository";
