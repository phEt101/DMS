import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { AuthContext } from "../context/auth-context";
import * as authService from "../services/authService";
import { permissionModulesChangedEvent } from "../../settings/access/modules/services/modules.service";
import type {
  AuthUser,
  LoginCredentials,
} from "../types/auth.types";

const MIN_LOGIN_LOADING_MS = 3000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingCompanyLogoUrl, setLoadingCompanyLogoUrl] = useState<string | null>(null);

  const refreshUser = useCallback(async (preserveUserOnError = false) => {
    try {
      const response = await authService.getCurrentUser()
      const u = response.data
      setUser((current) => current && JSON.stringify(current) === JSON.stringify(u) ? current : u)
    } catch (error) {
      const status = (error as Error & { status?: number }).status
      if (!preserveUserOnError || status === 401) setUser(null)
      else console.error("Unable to refresh current user", error)
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
    const startedAt = Date.now()
    const response = await authService.login(credentials);
    setLoadingCompanyLogoUrl(response.data.company?.logoUrl ?? null)
    const remainingLoadingMs = MIN_LOGIN_LOADING_MS - (Date.now() - startedAt)
    if (remainingLoadingMs > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, remainingLoadingMs))
    }
    setUser(response.data);
    setLoadingCompanyLogoUrl(null)
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, loadingCompanyLogoUrl, login, logout, refreshUser }),
    [user, isLoading, loadingCompanyLogoUrl, login, logout, refreshUser],
  );

  // โปรไฟล์ที่ Topbar: เมื่อมีการแก้ไขข้อมูลผู้ใช้ (ชื่อ/รูป/บทบาท ฯลฯ) → ดึงข้อมูลตัวเองใหม่ทันที
  // (ยิงจากหน้าจัดการพนักงาน/ผู้ใช้งาน/แผนก เมื่อบันทึกเสร็จ)
  useEffect(() => {
    const refresh = () => { void refreshUser() }
    window.addEventListener('dms:user-updated', refresh)
    return () => window.removeEventListener('dms:user-updated', refresh)
  }, [refreshUser])

  useEffect(() => {
    const refresh = () => { void refreshUser() }
    window.addEventListener(permissionModulesChangedEvent, refresh)
    return () => window.removeEventListener(permissionModulesChangedEvent, refresh)
  }, [refreshUser])

  useEffect(() => {
    if (!user) return
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshUser(true)
    }
    const intervalId = window.setInterval(refreshWhenVisible, 5000)
    document.addEventListener("visibilitychange", refreshWhenVisible)
    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener("visibilitychange", refreshWhenVisible)
    }
  }, [refreshUser, user?.id])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
