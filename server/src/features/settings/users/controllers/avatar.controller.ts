import path from "node:path";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import type { RequestHandler, Response } from "express";
import { db } from "../../../../config/database.js";
import { httpError } from "../../../../middleware/errors.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { avatarDirectory, avatarRelativePathOf, avatarUrlOf, deleteAvatarFile } from "../middleware/avatar-upload.middleware.js";
import { logActivity } from "../../activity/repositories/activity.repository.js";

// ดึงแผนกของเจ้าของรูปเพื่อจัดเก็บไฟล์ไว้ในโฟลเดอร์ย่อย + ชื่อผู้ใช้สำหรับตั้งชื่อไฟล์
async function targetUserInfo(id: number | string): Promise<{ department: string | null; name: string | null }> {
  const [rows] = await db.execute<(RowDataPacket & { department: string | null; name: string | null })[]>(
    "SELECT users.name AS name, departments.name AS department FROM users LEFT JOIN departments ON departments.id = users.department_id WHERE users.id = ? AND users.deleted_at IS NULL LIMIT 1",
    [id],
  );
  return { department: rows[0]?.department ?? null, name: rows[0]?.name ?? null };
}

// ย้ายไฟล์ชั่วคราว → storage/avatars/<แผนก>/<ชื่อผู้ใช้>-<id>.<นามสกุล>
function moveAvatarFile(tempName: string, relativePath: string): void {
  const destination = path.join(avatarDirectory, relativePath);
  mkdirSync(path.dirname(destination), { recursive: true });
  // ถ้ามีไฟล์ชื่อเดียวกันอยู่แล้ว (เช่นรูปเดิมของ user เดียวกัน) — ลบทิ้งก่อน กันไฟล์ซ้ำ
  if (existsSync(destination)) rmSync(destination);
  renameSync(path.join(avatarDirectory, tempName), destination);
}

function sendStoredAvatar(relativePath: string, res: Response): void {
  const fullPath = path.resolve(avatarDirectory, relativePath);
  if (!fullPath.startsWith(`${avatarDirectory}${path.sep}`)) throw httpError(400, "Invalid avatar path");
  res.sendFile(fullPath, (error) => {
    if (error && !res.headersSent) res.status(404).json({ message: "Avatar not found" });
  });
}

// URL แบบ user ID ใช้ชื่อไฟล์จากฐานข้อมูล จึงรองรับชื่อไทย/อักขระพิเศษและไฟล์เก่าด้วย
export const serveAvatarByUserId: RequestHandler = async (req, res) => {
  const id = String(req.params.id);
  if (!/^\d+$/.test(id)) throw httpError(400, "Invalid user id");
  const [rows] = await db.execute<(RowDataPacket & { avatar_path: string | null })[]>(
    "SELECT avatar_path FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
    [id],
  );
  const relativePath = rows[0]?.avatar_path;
  if (!relativePath) throw httpError(404, "Avatar not found");
  sendStoredAvatar(relativePath, res);
};

// รองรับ URL เก่า: GET /avatars/<ชื่อไฟล์> หรือ GET /avatars/<แผนก>/<ชื่อไฟล์>
export const serveAvatar: RequestHandler = (req, res) => {
  if (!req.user) throw httpError(401, "Authentication required");
  const raw = [req.params.department, req.params.file].filter(Boolean).join("/");
  const fileName = path.basename(String(req.params.file ?? ""));
  // อนุญาตตัวอักษร เครื่องหมายประกอบ (เช่นสระ/วรรณยุกต์ไทย) และตัวเลข — กัน path traversal
  if (!/^[\p{L}\p{M}\p{N}._-]+$/u.test(fileName) || raw.includes("..")) throw httpError(400, "Invalid file name");
  sendStoredAvatar(raw, res);
};

async function currentAvatarPath(id: number | string): Promise<string | null> {
  const [rows] = await db.execute<(RowDataPacket & { avatar_path: string | null })[]>(
    "SELECT avatar_path FROM users WHERE id = ? LIMIT 1",
    [id],
  );
  return rows[0]?.avatar_path ?? null;
}

// ตรวจสิทธิ์เปลี่ยนรูป: ตัวเอง / admin / มีสิทธิ์ "แก้ไขผู้ใช้งาน" / แผนกเข้าถึงโมดูล users หรือ documents_employees
function canManageAvatar(user: { id?: number; role?: { name?: string }; permissions?: Array<{ name: string }>; departmentModules?: string[] }, id: string): boolean {
  if (user?.id !== undefined && String(user.id) === id) return true;
  if (user?.role?.name?.trim().toLowerCase() === "admin") return true;
  if (user?.permissions?.some((permission) => permission.name === "แก้ไขผู้ใช้งาน")) return true;
  return user?.departmentModules?.some((moduleName) => moduleName === "users" || moduleName === "documents_employees") ?? false;
}

// อัปโหลด/เปลี่ยนรูปโปรไฟล์ของผู้ใช้ (multipart/form-data field: avatar)
export const uploadAvatar: RequestHandler = async (req, res) => {
  const id = String(req.params.id);
  const file = req.file;
  if (!file) throw httpError(400, "กรุณาแนบไฟล์รูปโปรไฟล์ (field: avatar)");
  const user = req.user as { id?: number; role?: { name?: string }; permissions?: Array<{ name: string }>; departmentModules?: string[] };
  if (!canManageAvatar(user, id)) {
    deleteAvatarFile(file.filename);
    throw httpError(403, "เปลี่ยนรูปโปรไฟล์ได้เฉพาะรูปของตัวเองหรือผู้มีสิทธิ์จัดการพนักงาน");
  }
  const previousPath = await currentAvatarPath(id);
  // ใช้ชื่อไฟล์อิงชื่อผู้ใช้ (เหมือนใบรับรองแพทย์) + user ID ท้ายชื่อไว้
  // ระบบเสิร์ฟรูปจาก path ในฐานข้อมูล ชื่อไทยในชื่อไฟล์จึงไม่กระทบการโหลดรูป
  const target = await targetUserInfo(id);
  const extension = path.extname(file.filename).toLowerCase();
  const relativePath = avatarRelativePathOf(target.department, id, target.name, extension);
  try {
    moveAvatarFile(file.filename, relativePath);
  } catch {
    deleteAvatarFile(file.filename);
    throw httpError(500, "บันทึกไฟล์รูปโปรไฟล์ไม่สำเร็จ");
  }
  const [result] = await db.execute<ResultSetHeader>(
    "UPDATE users SET avatar_path = ? WHERE id = ? AND deleted_at IS NULL",
    [relativePath, id],
  );
  if (result.affectedRows === 0) {
    deleteAvatarFile(relativePath);
    throw httpError(404, "User not found");
  }
  // ลบรูปเดิมออกจากดิสก์ — กันไฟล์ขยะสะสมเมื่อเปลี่ยนรูปบ่อย ๆ
  deleteAvatarFile(previousPath);
  await logActivity({
    userId: req.user?.id,
    module: "users",
    action: "updated",
    entityType: "user",
    entityId: id,
    details: { field: "avatar", file: relativePath },
    ipAddress: req.ip,
  });
  res.json({ data: { avatarUrl: avatarUrlOf(relativePath) } });
};

// ลบรูปโปรไฟล์ของผู้ใช้ — ใช้สิทธิ์เดียวกับ uploadAvatar
export const removeAvatar: RequestHandler = async (req, res) => {
  const id = String(req.params.id);
  const user = req.user as { id?: number; role?: { name?: string }; permissions?: Array<{ name: string }>; departmentModules?: string[] };
  if (!canManageAvatar(user, id)) {
    throw httpError(403, "เปลี่ยนรูปโปรไฟล์ได้เฉพาะรูปของตัวเองหรือผู้มีสิทธิ์จัดการพนักงาน");
  }
  const previousPath = await currentAvatarPath(id);
  if (!previousPath) throw httpError(404, "Avatar not found");
  const [result] = await db.execute<ResultSetHeader>(
    "UPDATE users SET avatar_path = NULL WHERE id = ? AND deleted_at IS NULL",
    [id],
  );
  if (result.affectedRows === 0) throw httpError(404, "User not found");
  deleteAvatarFile(previousPath);
  await logActivity({
    userId: req.user?.id,
    module: "users",
    action: "updated",
    entityType: "user",
    entityId: id,
    details: { field: "avatar", removed: true },
    ipAddress: req.ip,
  });
  res.status(204).end();
};
