"use client";
import "client-only";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";

import { logger } from "../../core/Logger";
import { apiClient } from "../../http";
import {
  getCookie,
  hasCookie,
  deleteCookie,
} from "../../utils/cookie.converter";
import {
  getClientSessionAdapter,
  type AdapterAuthUser,
} from "../../contracts/client-session";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal avatar metadata shape shared across consumers. */
export interface AvatarMetadataShape {
  url: string;
  position?: { x: number; y: number };
  zoom?: number;
}

/**
 * Hydrated session user — combines auth-adapter fields with server profile data.
 * Consumers may extend this via module augmentation or generics at the provider level.
 */
export interface SessionUser {
  // Auth fields
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;

  // Profile fields from server
  role: string;
  disabled?: boolean;
  createdAt?: Date;
  updatedAt?: Date;

  // Session tracking
  sessionId?: string;

  // Profile extras
  phoneVerified?: boolean;
  avatarMetadata?: AvatarMetadataShape | null;

  publicProfile?: Record<string, unknown>;
  stats?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface SessionContextValue {
  user: SessionUser | null;
  loading: boolean;
  sessionId: string | null;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
  updateSessionActivity: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Configurable API endpoint paths
// ---------------------------------------------------------------------------

export interface SessionEndpoints {
  /** POST — create server session from ID token */
  createSession: string;
  /** POST — update session activity */
  sessionActivity: string;
  /** POST — validate session */
  sessionValidate: string;
  /** POST — logout / destroy session */
  logout: string;
  /** GET — fetch user profile */
  userProfile: string;
}

const DEFAULT_ENDPOINTS: SessionEndpoints = {
  createSession: "/api/auth/session",
  sessionActivity: "/api/auth/session/activity",
  sessionValidate: "/api/auth/session/validate",
  logout: "/api/auth/logout",
  userProfile: "/api/user/profile",
};

// ---------------------------------------------------------------------------
// Session cookie constants
// ---------------------------------------------------------------------------

const SESSION_COOKIE = "__session";
const SESSION_ID_COOKIE = "__session_id";
const ACTIVITY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// React-query cache invalidation callback type
// ---------------------------------------------------------------------------

export type InvalidateQueriesFn = (queryKey: string[]) => void;

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const SessionContext = createContext<SessionContextValue | undefined>(
  undefined,
);

export interface SessionProviderProps {
  children: React.ReactNode;
  /** SSR-hydrated user (from server layout) */
  initialUser?: SessionUser | null;
  /** Override default API endpoint paths */
  endpoints?: Partial<SessionEndpoints>;
  /**
   * Optional callback to invalidate react-query caches on sign-out.
   * Called once per query key group: `["cart"]`, `["wishlist"]`, etc.
   */
  onSignOutInvalidate?: InvalidateQueriesFn;
  /**
   * Query key groups to invalidate on sign-out.
   * Defaults to common marketplace keys.
   */
  signOutInvalidationKeys?: string[][];
}

const DEFAULT_INVALIDATION_KEYS = [
  ["cart"],
  ["wishlist"],
  ["notifications"],
  ["orders"],
  ["profile"],
  ["user"],
  ["addresses"],
  ["bids"],
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSessionIdFromCookie(): string | null {
  return getCookie(SESSION_ID_COOKIE);
}

function hasSessionCookie(): boolean {
  return hasCookie(SESSION_ID_COOKIE);
}

function buildSessionUser(
  authUser: AdapterAuthUser,
  serverData: Partial<SessionUser>,
): SessionUser {
  const currentSessionId = getSessionIdFromCookie();
  return {
    uid: authUser.uid,
    email: authUser.email,
    emailVerified: authUser.emailVerified,
    displayName: serverData.displayName || authUser.displayName,
    photoURL: serverData.photoURL || authUser.photoURL,
    phoneNumber: serverData.phoneNumber || authUser.phoneNumber,
    role: serverData.role || "user",
    disabled: serverData.disabled,
    createdAt: serverData.createdAt
      ? new Date(serverData.createdAt)
      : undefined,
    updatedAt: serverData.updatedAt
      ? new Date(serverData.updatedAt)
      : undefined,
    sessionId: currentSessionId || undefined,
    phoneVerified: serverData.phoneVerified,
    avatarMetadata: serverData.avatarMetadata?.url
      ? {
          url: serverData.avatarMetadata.url,
          position: serverData.avatarMetadata.position || { x: 50, y: 50 },
          zoom: serverData.avatarMetadata.zoom || 1,
        }
      : null,
    publicProfile: serverData.publicProfile,
    stats: serverData.stats,
    metadata: serverData.metadata,
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function SessionProvider({
  children,
  initialUser,
  endpoints: endpointOverrides,
  onSignOutInvalidate,
  signOutInvalidationKeys = DEFAULT_INVALIDATION_KEYS,
}: SessionProviderProps) {
  const ep = useMemo<SessionEndpoints>(
    () => ({ ...DEFAULT_ENDPOINTS, ...endpointOverrides }),
    [endpointOverrides],
  );

  const [user, setUser] = useState<SessionUser | null>(initialUser ?? null);
  const [loading, setLoading] = useState(initialUser == null);
  const [sessionId, setSessionId] = useState<string | null>(
    initialUser?.sessionId ?? null,
  );

  const activityUpdateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const updateSessionActivityRef = useRef<(() => Promise<void>) | undefined>(
    undefined,
  );
  const signOutRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const serverHydratedUid = useRef<string | null>(initialUser?.uid ?? null);

  // -----------------------------------------------------------------------
  // Profile fetchers
  // -----------------------------------------------------------------------

  const fetchUserProfile = useCallback(
    async (authUser: AdapterAuthUser): Promise<SessionUser> => {
      try {
        const data = await apiClient.get<Partial<SessionUser>>(ep.userProfile);
        return buildSessionUser(authUser, data);
      } catch (error) {
        logger.error("Failed to fetch user profile", { error });
        return {
          uid: authUser.uid,
          email: authUser.email,
          emailVerified: authUser.emailVerified,
          displayName: authUser.displayName,
          photoURL: authUser.photoURL,
          phoneNumber: authUser.phoneNumber,
          role: "user",
          sessionId: getSessionIdFromCookie() || undefined,
        };
      }
    },
    [ep.userProfile],
  );

  const fetchUserProfileFromServer =
    useCallback(async (): Promise<SessionUser | null> => {
      try {
        const data = await apiClient.get<Partial<SessionUser>>(ep.userProfile);
        const currentSessionId = getSessionIdFromCookie();
        return {
          uid: data.uid ?? "",
          email: data.email || null,
          emailVerified: data.emailVerified || false,
          displayName: data.displayName || null,
          photoURL: data.photoURL || null,
          phoneNumber: data.phoneNumber || null,
          role: data.role || "user",
          disabled: data.disabled,
          createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
          sessionId: currentSessionId || undefined,
          phoneVerified: data.phoneVerified,
          avatarMetadata: data.avatarMetadata?.url
            ? {
                url: data.avatarMetadata.url,
                position: data.avatarMetadata.position || { x: 50, y: 50 },
                zoom: data.avatarMetadata.zoom || 1,
              }
            : null,
          publicProfile: data.publicProfile,
          stats: data.stats,
          metadata: data.metadata,
        };
      } catch {
        return null;
      }
    }, [ep.userProfile]);

  // -----------------------------------------------------------------------
  // Session activity
  // -----------------------------------------------------------------------

  const updateSessionActivity = useCallback(async () => {
    const currentSessionId = getSessionIdFromCookie();
    if (!currentSessionId || !user) return;
    try {
      await apiClient.post(ep.sessionActivity, {
        sessionId: currentSessionId,
      });
    } catch (error) {
      logger.debug("Session activity update failed", { error });
    }
  }, [user, ep.sessionActivity]);

  useEffect(() => {
    updateSessionActivityRef.current = updateSessionActivity;
  }, [updateSessionActivity]);

  // -----------------------------------------------------------------------
  // Refresh helpers
  // -----------------------------------------------------------------------

  const refreshUser = useCallback(async () => {
    const adapter = getClientSessionAdapter();
    const currentAuth = adapter.getCurrentUser();
    if (currentAuth) {
      const userData = await fetchUserProfile(currentAuth);
      setUser(userData);
    } else if (hasSessionCookie()) {
      const userData = await fetchUserProfileFromServer();
      if (userData) {
        setUser(userData);
        const sid = getSessionIdFromCookie();
        if (sid) setSessionId(sid);
      }
    }
  }, [fetchUserProfile, fetchUserProfileFromServer]);

  const refreshSession = useCallback(async () => {
    try {
      const data = await apiClient.post<{
        valid: boolean;
        sessionId: string;
      }>(ep.sessionValidate, {});
      if (data.valid && data.sessionId) setSessionId(data.sessionId);
    } catch (error) {
      await signOutRef.current?.();
      logger.error("Session validation failed", { error });
    }
  }, [ep.sessionValidate]);

  // -----------------------------------------------------------------------
  // Sign out
  // -----------------------------------------------------------------------

  const signOut = useCallback(async () => {
    const adapter = getClientSessionAdapter();
    try {
      try {
        await apiClient.post(ep.logout, {});
      } catch (error) {
        logger.error("Server logout failed", { error });
      }
      await adapter.signOut();

      if (onSignOutInvalidate) {
        for (const key of signOutInvalidationKeys) {
          onSignOutInvalidate(key);
        }
      }

      setUser(null);
      setSessionId(null);
      if (activityUpdateRef.current) {
        clearInterval(activityUpdateRef.current);
        activityUpdateRef.current = null;
      }
      deleteCookie(SESSION_COOKIE);
      deleteCookie(SESSION_ID_COOKIE);
    } catch (error) {
      logger.error("Sign out failed", { error });
      setUser(null);
      setSessionId(null);
      throw error;
    }
  }, [ep.logout, onSignOutInvalidate, signOutInvalidationKeys]);

  useEffect(() => {
    signOutRef.current = signOut;
  }, [signOut]);

  // -----------------------------------------------------------------------
  // Auth state listener
  // -----------------------------------------------------------------------

  useEffect(() => {
    const adapter = getClientSessionAdapter();
    let authVersion = 0;

    const unsubscribe = adapter.onAuthStateChanged(async (authUser) => {
      const thisVersion = ++authVersion;

      if (authUser) {
        const hasSession = hasSessionCookie();
        if (!hasSession) {
          try {
            const idToken = await authUser.getIdToken(true);
            if (thisVersion !== authVersion) return;
            const data = await apiClient.post<{ sessionId?: string }>(
              ep.createSession,
              { idToken },
            );
            if (thisVersion !== authVersion) return;
            if (data?.sessionId) setSessionId(data.sessionId);
          } catch (error) {
            logger.error("Session creation failed", { error });
          }
        }

        if (thisVersion !== authVersion) return;

        // Skip redundant profile fetch when SSR already hydrated this user
        if (serverHydratedUid.current === authUser.uid) {
          serverHydratedUid.current = null;
          const currentSessionId = getSessionIdFromCookie();
          if (currentSessionId) setSessionId(currentSessionId);
          if (activityUpdateRef.current)
            clearInterval(activityUpdateRef.current);
          activityUpdateRef.current = setInterval(
            () => updateSessionActivityRef.current?.(),
            ACTIVITY_INTERVAL_MS,
          );
          setLoading(false);
          return;
        }

        const userData = await fetchUserProfile(authUser);
        if (thisVersion !== authVersion) return;
        setUser(userData);
        const currentSessionId = getSessionIdFromCookie();
        if (currentSessionId) setSessionId(currentSessionId);
        if (activityUpdateRef.current) clearInterval(activityUpdateRef.current);
        activityUpdateRef.current = setInterval(
          () => updateSessionActivityRef.current?.(),
          ACTIVITY_INTERVAL_MS,
        );
      } else {
        // No auth user — try server-session fallback (OAuth flows)
        if (hasSessionCookie()) {
          const serverUser = await fetchUserProfileFromServer();
          if (thisVersion !== authVersion) return;
          if (serverUser) {
            setUser(serverUser);
            const sid = getSessionIdFromCookie();
            if (sid) setSessionId(sid);
            setLoading(false);
            return;
          }
          deleteCookie(SESSION_COOKIE);
          deleteCookie(SESSION_ID_COOKIE);
        }
        setUser(null);
        setSessionId(null);
        if (activityUpdateRef.current) {
          clearInterval(activityUpdateRef.current);
          activityUpdateRef.current = null;
        }
      }
      setLoading(false);
    });

    return () => {
      authVersion++;
      unsubscribe();
      if (activityUpdateRef.current) clearInterval(activityUpdateRef.current);
    };
  }, [ep.createSession, fetchUserProfile, fetchUserProfileFromServer]);

  // -----------------------------------------------------------------------
  // Memoized value
  // -----------------------------------------------------------------------

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      loading,
      sessionId,
      isAuthenticated: !!user && !!sessionId,
      refreshUser,
      refreshSession,
      signOut,
      updateSessionActivity,
    }),
    [
      user,
      loading,
      sessionId,
      refreshUser,
      refreshSession,
      signOut,
      updateSessionActivity,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Consumer hooks
// ---------------------------------------------------------------------------

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}

export function useAuth() {
  const { user, loading, refreshUser } = useSession();
  return { user, loading, refreshUser };
}
