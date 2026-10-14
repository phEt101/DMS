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

  const refreshUser = useCallback(async () => {
    try {
      const response = await authService.getCurrentUser()
      // Keep the existing client-side Survey access adjustment for dev admin accounts.
      const u = response.data
      const roleName = String(u.role?.name || '').trim().toLowerCase()
      const hasSurvey = Array.isArray(u.permissions) && u.permissions.some((p) => p.module === 'survey')
      if (!hasSurvey && (roleName === 'admin' || roleName === 'manager')) {
        setUser({ ...u, permissions: [...u.permissions, { id: -999, name: 'เข้าถึงเมนูแบบสำรวจ', module: 'survey', moduleIconName: null, moduleSortOrder: 999 }] })
      } else {
        setUser(u)
      }
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let isActive = true
    void refreshUser().finally(() => {
      if (isActive) setIsLoading(false)
    })
    return () => { isActive = false }
  }, [refreshUser])

  const login = useCallback(async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials);
    setUser(response.data);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, logout, refreshUser }),
    [user, isLoading, login, logout, refreshUser],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
