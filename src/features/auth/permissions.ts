import type { AuthUser } from "./types/auth.types";

export const viewPermissionByModule: Record<string, string> = {
  dashboard: "เข้าถึงเมนูแดชบอร์ด",
  documents: "เข้าถึงเมนูเอกสาร",
  reports: "เข้าถึงเมนูรายงาน",
  trash: "เข้าถึงเมนูถังขยะ",
  users: "เข้าถึงเมนูผู้ใช้งาน",
  roles: "เข้าถึงเมนูบทบาทและสิทธิ์",
  departments: "เข้าถึงเมนูแผนก",
  permissions: "เข้าถึงเมนูสิทธิ์",
  modules: "เข้าถึงเมนูโมดูล",
  activity_logs: "เข้าถึงเมนูบันทึกกิจกรรม",
};

const legacyViewPermissionsByModule: Record<string, string[]> = {
  dashboard: ["ดูแดชบอร์ด"],
  documents: ["ดูเอกสาร"],
  reports: ["ดูรายงาน"],
  trash: ["ดูถังขยะ"],
  users: ["ดูผู้ใช้งาน"],
  roles: ["ดูบทบาทและสิทธิ์", "จัดการบทบาทและสิทธิ์"],
  departments: ["ดูแผนก", "จัดการแผนก"],
  permissions: ["ดูสิทธิ์"],
  modules: ["ดูโมดูล"],
  activity_logs: ["ดูบันทึกกิจกรรม"],
};

export function canViewModule(user: AuthUser, module: string): boolean {
  const requiredPermission = viewPermissionByModule[module];
  return Boolean(
    requiredPermission &&
    user.permissions.some(
      (permission) => permission.module === module && permission.name === requiredPermission,
    ) || user.permissions.some((permission) =>
      permission.module === module &&
      (legacyViewPermissionsByModule[module] ?? []).includes(permission.name),
    ),
  );
}

export function hasPermission(user: AuthUser, permissionName: string): boolean {
  return user.permissions.some((permission) => permission.name === permissionName);
}

export function hasAnyPermission(user: AuthUser, ...permissionNames: string[]): boolean {
  return permissionNames.some((permissionName) => hasPermission(user, permissionName));
}
