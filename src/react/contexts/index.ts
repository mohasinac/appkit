// ThemeProvider/useTheme/ThemeMode moved to "@mohasinac/appkit/client"
// (registry-aware ThemeProvider lives in _internal/client/theme).
export { SessionProvider, useSession, useAuth } from "./SessionContext";
export type {
  SessionUser,
  SessionContextValue,
  SessionEndpoints,
  SessionProviderProps,
  AvatarMetadataShape,
  InvalidateQueriesFn,
} from "./SessionContext";
