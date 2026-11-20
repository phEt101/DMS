import type { RequestHandler } from "express";

/**
 * จำกัดเฉพาะ "การล็อกอินที่ผิด" ไม่นับคำขอที่สำเร็จ
 *
 * ทำไมไม่ใช้ตัวนับแบบนับทุกคำขอ: เวลาแชร์ให้หลายคนใช้พร้อมกัน (ไวไฟเดียวกัน/ผ่าน proxy)
 * ทุกคนออกเน็ตด้วย IP เดียวกัน ตัวนับแบบเดิมจะบล็อกคนที่เหลือทันทีที่เกิน 5 คำขอ
 * แม้รหัสผ่านจะถูกต้อง เพราะมันบวกยอดตอนเริ่มคำขอ แล้วค่อยคืนให้ทีหลังเมื่อสำเร็จ
 *
 * ตัวนี้จึงนับหลังทราบผลแล้ว (401 = ผิด) และคีย์ด้วย IP + อีเมล เพื่อให้แต่ละบัญชี
 * มีโควตาของตัวเอง การล็อกอินถูกต้องพร้อมกันกี่คนก็ผ่านได้
 */
const WINDOW_MINUTES = positiveInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES, 15);
const MAX_FAILURES = positiveInt(process.env.LOGIN_RATE_LIMIT_MAX_FAILURES, 10);
const WINDOW_MS = WINDOW_MINUTES * 60 * 1000;
const MAX_TRACKED_KEYS = 5_000;

interface FailureRecord {
  failures: number;
  resetAt: number;
}

const failuresByKey = new Map<string, FailureRecord>();

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function keyOf(req: Parameters<RequestHandler>[0]): string {
  const email =
    req.body !== null && typeof req.body === "object" && typeof (req.body as { email?: unknown }).email === "string"
      ? (req.body as { email: string }).email.trim().toLowerCase()
      : "";
  return `${req.ip ?? "unknown"}|${email}`;
}

function pruneExpired(now: number): void {
  for (const [key, record] of failuresByKey) {
    if (record.resetAt <= now) failuresByKey.delete(key);
  }
}

export const loginRateLimiter: RequestHandler = (req, res, next) => {
  const key = keyOf(req);
  const now = Date.now();
  const record = failuresByKey.get(key);

  if (record !== undefined && record.resetAt > now && record.failures >= MAX_FAILURES) {
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfterSeconds));
    res.status(429).json({
      message: `พยายามเข้าสู่ระบบไม่สำเร็จหลายครั้งเกินไป กรุณาลองใหม่ในอีก ${Math.ceil(retryAfterSeconds / 60)} นาที`,
    });
    return;
  }

  res.on("finish", () => {
    const finishedAt = Date.now();
    if (res.statusCode === 401) {
      const current = failuresByKey.get(key);
      if (current === undefined || current.resetAt <= finishedAt) {
        failuresByKey.set(key, { failures: 1, resetAt: finishedAt + WINDOW_MS });
      } else {
        current.failures += 1;
      }
      if (failuresByKey.size > MAX_TRACKED_KEYS) pruneExpired(finishedAt);
      return;
    }
    // ล็อกอินสำเร็จ: ล้างประวัติที่ผิดของบัญชีนี้ทันที
    if (res.statusCode === 200) failuresByKey.delete(key);
  });

  next();
};
