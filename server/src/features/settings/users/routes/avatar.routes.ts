import { Router } from "express";
import { asyncHandler } from "../../../../middleware/errors.js";
import { requireAuth } from "../../../auth/middleware/require-auth.middleware.js";
import { avatarUpload } from "../middleware/avatar-upload.middleware.js";
import {
  removeAvatar,
  serveAvatarByUserId,
  serveAvatar,
  uploadAvatar,
} from "../controllers/avatar.controller.js";

// เรียกดูรูป (ต้องล็อกอิน) — <img src> ของ browser จะแนบ cookie มาเอง
// mount ที่ /boswell-api/v1/avatars → GET /avatars/:file (แบบเก่า) หรือ GET /avatars/:department/:file (แบบใหม่ แยกโฟลเดอร์ตามแผนก)
export const avatarsRouter = Router();
avatarsRouter.get("/user/:id", requireAuth, asyncHandler(serveAvatarByUserId));
avatarsRouter.get("/:file", requireAuth, asyncHandler(serveAvatar));
avatarsRouter.get("/:department/:file", requireAuth, asyncHandler(serveAvatar));

// อัปโหลด/ลบรูปโปรไฟล์ — mount ที่ /boswell-api/v1/users ต่อจาก usersRouter
// → POST /users/:id/avatar, DELETE /users/:id/avatar
// (ผู้ใช้เปลี่ยนรูปตัวเองได้, ผู้มีสิทธิ์ "แก้ไขผู้ใช้งาน" ทำได้ทุกคน — ตรวจใน controller)
export const avatarUserRouter = Router();
avatarUserRouter.post("/:id/avatar", avatarUpload.single("avatar"), asyncHandler(uploadAvatar));
avatarUserRouter.delete("/:id/avatar", asyncHandler(removeAvatar));
