import type { AuthUser } from "./types/auth.types";

export function canViewModule(user: AuthUser, module: string): boolean {
  if (user.role.name.trim().toLocaleLowerCase() === "admin") return true;
  if (module === "projects") return user.departmentModules.some((key) => ["projects", "projects_cm", "survey"].includes(key));
  if (module === "documents") return user.departmentModules.some((key) => key.startsWith("documents_") || key === "report");
  if (module === "reports") return user.departmentModules.includes("report");
  return user.departmentModules.includes(module);
}

export function canViewAllDocumentPages(user: AuthUser): boolean {
  return user.role.name.trim().toLocaleLowerCase() === "admin";
}

export function canViewDepartmentModule(user: AuthUser, module: string): boolean {
  return user.role.name.trim().toLocaleLowerCase() === "admin" || user.departmentModules.includes(module);
}

export function hasPermission(user: AuthUser, permissionName: string): boolean {
  return user.permissions.some((permission) => permission.name === permissionName);
}

export function hasAnyPermission(user: AuthUser, ...permissionNames: string[]): boolean {
  return permissionNames.some((permissionName) => hasPermission(user, permissionName));
}
