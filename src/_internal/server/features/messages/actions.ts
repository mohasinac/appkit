/**
 * Messages server actions — thin re-exports. Keeps RTDB ping-channel behaviour
 * (firestore canonical + RTDB notification) in the source action so consumers
 * cannot bypass it.
 */

export {
  sendMessage as sendMessageAction,
  markConversationRead as markConversationReadAction,
  MESSAGE_MAX_LENGTH,
} from "../../../../features/messages/actions/messages-actions";
