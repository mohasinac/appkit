/**
 * Account server actions — thin re-exports from `features/account/actions`.
 * Consumers should import from this `_internal/server/features/account/`
 * path so future refactors can rewire the source of truth without touching
 * route shims.
 */

export {
  createAddressForUser as createAddressForUserAction,
  updateAddressForUser as updateAddressForUserAction,
  deleteAddressForUser as deleteAddressForUserAction,
  setDefaultAddressForUser as setDefaultAddressForUserAction,
  listAddressesForUser as listAddressesForUserAction,
  getAddressByIdForUser as getAddressByIdForUserAction,
} from "../../../../features/account/actions/address-actions";
