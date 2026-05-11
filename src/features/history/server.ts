/**
 * @mohasinac/appkit/features/history/server
 * Server-only entry point for history repository + actions.
 */
export * from "./actions";

export {
  UserHistoryRepository,
  historyRepository,
  type UserHistoryItem,
  type HistoryDocument,
  type HistoryItemSnapshot,
  type HistoryProductType,
} from "./repository/user-history.repository";
