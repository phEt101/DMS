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
      const u = response.data
      setUser(u)
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

  // โปรไฟล์ที่ Topbar: เมื่อมีการแก้ไขข้อมูลผู้ใช้ (ชื่อ/รูป/บทบาท ฯลฯ) → ดึงข้อมูลตัวเองใหม่ทันที
  // (ยิงจากหน้าจัดการพนักงาน/ผู้ใช้งาน/แผนก เมื่อบันทึกเสร็จ)
  useEffect(() => {
    const refresh = () => { void refreshUser() }
    window.addEventListener('dms:user-updated', refresh)
    return () => window.removeEventListener('dms:user-updated', refresh)
  }, [refreshUser])

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
