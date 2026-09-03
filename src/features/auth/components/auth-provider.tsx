import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { AuthContext } from "../context/auth-context";
import * as authService from "../services/authService";
import type {
  AuthUser,
  LoginCredentials,
} from "../types/auth.types";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    void authService
      .getCurrentUser()
      .then((response) => {
        if (isActive) setUser(response.data);
      })
      .catch(() => {
        if (isActive) setUser(null);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials);
    setUser(response.data);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, logout }),
    [user, isLoading, login, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
