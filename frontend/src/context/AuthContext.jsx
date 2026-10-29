
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api, endpoints, getErrorMessage, initializeCsrf } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get(endpoints.me);
      const data = response.data;

      const currentUser = data?.user ?? null;
      setUser(data?.authenticated ? currentUser : null);
      return currentUser;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        await initializeCsrf();
      } catch {
        // The session check below will report whether the API is reachable.
      }

      try {
        const response = await api.get(endpoints.me);
        if (!active) return;

        const data = response.data;
        setUser(data?.authenticated ? data?.user ?? null : null);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    await initializeCsrf();
    const response = await api.post(endpoints.login, { username, password });

    const loggedInUser = response.data?.user;
    setUser(loggedInUser ?? null);

    return loggedInUser;
  }, []);

  const register = useCallback(async (payload) => {
    await initializeCsrf();
    const response = await api.post(endpoints.register, payload);

    const registeredUser = response.data?.user;

    if (registeredUser) {
      setUser(registeredUser);
    } else {
      await refreshUser();
    }

    return registeredUser;
  }, [refreshUser]);

  const logout = useCallback(async () => {
    try {
      await initializeCsrf();
      await api.post(endpoints.logout);
    } catch (error) {
      // Clear local UI state even if the server request fails.
      setUser(null);
      throw new Error(getErrorMessage(error));
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}
