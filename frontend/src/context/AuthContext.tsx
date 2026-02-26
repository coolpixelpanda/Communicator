import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { api, setApiToken } from "../api";

interface AuthState {
  token: string;
  userId: string;
  username: string;
}

interface AuthContextValue {
  auth: AuthState | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadAuth(): AuthState | null {
  const token = sessionStorage.getItem("token");
  const userId = sessionStorage.getItem("userId");
  const username = sessionStorage.getItem("username");
  if (token && userId && username) return { token, userId, username };
  return null;
}

function saveAuth(state: AuthState) {
  sessionStorage.setItem("token", state.token);
  sessionStorage.setItem("userId", state.userId);
  sessionStorage.setItem("username", state.username);
}

function clearAuth() {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("userId");
  sessionStorage.removeItem("username");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(() => {
    const loaded = loadAuth();
    if (loaded) setApiToken(loaded.token);
    return loaded;
  });

  const handleAuth = useCallback(
    async (fn: () => Promise<{ token: string; userId: string; username: string }>) => {
      const result = await fn();
      const state = { token: result.token, userId: result.userId, username: result.username };
      saveAuth(state);
      setApiToken(state.token);
      setAuth(state);
    },
    []
  );

  const login = useCallback(
    (username: string, password: string) =>
      handleAuth(() => api.login(username, password)),
    [handleAuth]
  );

  const register = useCallback(
    (username: string, password: string) =>
      handleAuth(() => api.register(username, password)),
    [handleAuth]
  );

  const logout = useCallback(() => {
    clearAuth();
    setApiToken(null);
    setAuth(null);
  }, []);

  return (
    <AuthContext.Provider value={{ auth, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
