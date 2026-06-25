"use client";

// Auth_Context — the single source of truth for the frontend authentication
// session. Mirrors the structure of `PreferencesProvider` (`preferences.tsx`):
// a `"use client"` provider built on `useState` + `useEffect`, a memoized
// context value, and a `useAuth()` hook.
//
// Responsibilities:
//   - Hold the active session: `token` / `user`, plus a restore `status`
//     ("restoring" → "ready") and a `persistError` flag.
//   - On mount, restore the persisted session through the Session_Store,
//     clearing any partial/malformed record, then flip `status` to "ready"
//     (Requirements 4.2, 8.1, 8.8, 8.9).
//   - Wire the current token into the API_Client via `setAuthTokenProvider`
//     so authenticated requests carry `Bearer <token>` (Requirements 4.3, 4.8).
//   - Expose `login` / `register` / `logout` actions:
//       * login sets the active session and persists it, flagging
//         `persistError` when `writeSession` fails (Requirements 4.1, 4.6,
//         8.3); a failed login leaves the session untouched (Requirement 8.7).
//       * register returns the created account without touching the active
//         session or Session_Store (Requirements 8.6, 8.7).
//       * logout always clears the session in a `finally`, regardless of the
//         API outcome (Requirements 6.4, 6.5, 8.4).
//   - Derive `isAuthenticated = token !== null && user !== null`
//     (Requirements 4.4, 8.2).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { apiClient, setAuthTokenProvider } from "@/lib/api/client";
import {
  clearSession,
  readSession,
  writeSession,
} from "@/lib/auth/session-store";
import type {
  AuthContextValue,
  AuthUser,
  LoginPayload,
  RegisterPayload,
  RegisterResult,
} from "@/lib/types";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<"restoring" | "ready">("restoring");
  const [persistError, setPersistError] = useState<boolean>(false);

  // Keep a live ref of the current token so the token provider registered with
  // the API_Client always reads the latest value without re-registering on
  // every change (Requirements 4.3, 4.8).
  const tokenRef = useRef<string | null>(token);
  tokenRef.current = token;

  // Expose the current Access_Token to the API_Client. Registered once so the
  // transport layer can attach `Bearer <token>` while a session is held and
  // omit it otherwise (Requirements 4.3, 4.8).
  useEffect(() => {
    setAuthTokenProvider(() => tokenRef.current);
  }, []);

  // Mount: restore the persisted session, clearing partial/malformed records,
  // then mark restoration complete (Requirements 4.2, 8.1, 8.8, 8.9).
  useEffect(() => {
    const restored = readSession();
    if (restored) {
      setToken(restored.token);
      setUser(restored.user);
    } else {
      // No valid session — drop any partial/malformed record so a stale token
      // or user does not linger in storage (Requirements 8.1, 8.9).
      clearSession();
    }
    setStatus("ready");
  }, []);

  // login: on success set the active session and persist it; a persist failure
  // keeps the in-memory session and flags `persistError` (Requirements 4.1,
  // 4.6, 8.3). A thrown ApiError propagates to the caller with the active
  // session left unchanged (Requirement 8.7).
  const login = useCallback(async (payload: LoginPayload): Promise<void> => {
    const session = await apiClient.login(payload);
    setToken(session.token);
    setUser(session.user);
    const ok = writeSession(session);
    setPersistError(!ok);
  }, []);

  // register: returns the created account without mutating the active session,
  // the persisted Session_Store, or the authentication status (Requirement 8.6).
  // A thrown ApiError propagates to the caller (Requirement 8.7).
  const register = useCallback(
    async (payload: RegisterPayload): Promise<RegisterResult> => {
      return apiClient.register(payload);
    },
    [],
  );

  // logout: always end in a cleared session — the `finally` clears the active
  // session and Session_Store whether the API call succeeds or fails
  // (Requirements 6.4, 6.5, 8.4).
  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiClient.logout();
    } finally {
      setToken(null);
      setUser(null);
      setPersistError(false);
      clearSession();
    }
  }, []);

  const isAuthenticated = token !== null && user !== null;

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isAuthenticated,
      status,
      persistError,
      login,
      register,
      logout,
    }),
    [token, user, isAuthenticated, status, persistError, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Read the Auth_Context. Must be called within an `AuthProvider`; throws
 * otherwise so a missing provider surfaces as a clear development error.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
