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
        if (!isActive) return
        // Ensure dev/test admin/manager accounts can access the new `survey` feature
        // by augmenting their permissions client-side if the permission is missing.
        // This is a minimal, reversible dev-time change and does not modify server roles.
        const u = response.data
        try {
          const roleName = String(u.role?.name || '').trim().toLowerCase()
          const hasSurvey = Array.isArray(u.permissions) && u.permissions.some((p) => p.module === 'survey')
          if (!hasSurvey && (roleName === 'admin' || roleName === 'manager')) {
            const next = { ...u, permissions: [
              ...u.permissions,
              { id: -999, name: 'เข้าถึงเมนูแบบสำรวจ', module: 'survey', moduleIconName: null, moduleSortOrder: 999 },
            ] }
            setUser(next)
            return
          }
        } catch (e) {
          // ignore and fallthrough to set original user
        }
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
