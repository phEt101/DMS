import type { AuthUser } from "./types/auth.types";

export const viewPermissionByModule: Record<string, string> = {
  dashboard: "เข้าถึงเมนูแดชบอร์ด",
  projects: "เข้าถึงเมนูโครงการ",
  documents: "เข้าถึงเมนูเอกสาร",
  survey: "เข้าถึงเมนูแบบสำรวจ",
  reports: "เข้าถึงเมนูรายงาน",
  users: "เข้าถึงเมนูผู้ใช้งาน",
  roles: "เข้าถึงเมนูบทบาทและสิทธิ์",
  departments: "เข้าถึงเมนูแผนก",
  permissions: "เข้าถึงเมนูสิทธิ์",
  modules: "เข้าถึงเมนูโมดูล",
  companies: "เข้าถึงเมนูบริษัท",
  activity_logs: "เข้าถึงเมนูบันทึกกิจกรรม",
};

const legacyViewPermissionsByModule: Record<string, string[]> = {
  dashboard: ["ดูแดชบอร์ด"],
  projects: ["ดูโครงการ"],
  survey: ["ดูแบบสำรวจ"],
  reports: ["ดูรายงาน"],
  users: ["ดูผู้ใช้งาน"],
  roles: ["ดูบทบาทและสิทธิ์", "จัดการบทบาทและสิทธิ์"],
  departments: ["ดูแผนก", "จัดการแผนก"],
  permissions: ["ดูสิทธิ์"],
  modules: ["ดูโมดูล"],
  companies: ["จัดการบริษัท"],
  activity_logs: ["ดูบันทึกกิจกรรม"],
};

export function canViewModule(user: AuthUser, module: string): boolean {
  if (module === "documents") {
    const role = user.role.name.trim().toLocaleLowerCase();
    const department = (user.department ?? "").trim().toLocaleLowerCase();
    // HR Div. เข้าเมนูเอกสารได้ (จัดการได้เฉพาะแผนก HR) · admin เข้าได้ทุกอย่าง
    if (role === "admin" || department === "hr div.") return true;
  }
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

export function canViewAllDocumentPages(user: AuthUser): boolean {
  const role = user.role.name.trim().toLocaleLowerCase();
  const department = (user.department ?? "").trim().toLocaleLowerCase();
  // เฉพาะ admin เห็นทุกหน้าของเอกสาร — HR Div. เห็นเฉพาะหน้าพนักงาน + รอนุมัติ (ตาม App.tsx)
  return role === "admin";
}

export function hasPermission(user: AuthUser, permissionName: string): boolean {
  return user.permissions.some((permission) => permission.name === permissionName);
}

export function hasAnyPermission(user: AuthUser, ...permissionNames: string[]): boolean {
  return permissionNames.some((permissionName) => hasPermission(user, permissionName));
}
