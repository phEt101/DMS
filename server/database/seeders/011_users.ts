import bcrypt from "bcryptjs";
import type { Connection } from "mysql2/promise";

const users = [
  {
    name: "คุณกีรติ",
    email: "keerati@boswell.co.th",
    phone: null,
    role: "manager",
    department: "Managing Director",
  },
  {
    name: "คุณสมเกียรติ",
    email: "somkiat@boswell.co.th",
    phone: null,
    role: "manager",
    department: "Deputy Managing Director",
  },
  {
    name: "คุณอัยลดา",
    email: "ailada@boswell.co.th",
    phone: null,
    role: "manager",
    department: "Financial, Accounting Div.",
  },
  {
    name: "คุณนัฐริณีย์",
    email: "nuttarinee@boswell.co.th",
    phone: null,
    role: "user",
    department: "Financial, Accounting Div.",
  },
  {
    name: "คุณวราภรณ์",
    email: "waraporn@boswell.co.th",
    phone: null,
    role: "user",
    department: "Financial, Accounting Div.",
  },
  {
    name: "คุณชัญญานุช",
    email: "chanyanuch@boswell.co.th",
    phone: null,
    role: "manager",
    department: "HR Div.",
  },
  {
    name: "คุณมนัส",
    email: "manat@boswell.co.th",
    phone: null,
    role: "user",
    department: "HR Div.",
  },
  {
    name: "คุณเคียงเดือน",
    email: "duan@boswell.co.th",
    phone: null,
    role: "manager",
    department: "Procurement Div.",
  },
  {
    name: "คุณกฤษณา",
    email: "krissana@boswell.co.th",
    phone: null,
    role: "user",
    department: "Procurement Div.",
  },
  {
    name: "คุณศุภฤกษ์",
    email: "suparerk@boswell.co.th",
    phone: null,
    role: "manager",
    department: "IT Div.",
  },
  {
    name: "คุณทักษ์ดนัย",
    email: "takdanai@boswell.co.th",
    phone: null,
    role: "user",
    department: "IT Div.",
  },
  {
    name: "คุณสมบุญ",
    email: "somboon@boswell.co.th",
    phone: null,
    role: "manager",
    department: "Sales Div.",
  },
  {
    name: "คุณสุภาวดี",
    email: "supawadee@boswell.co.th",
    phone: null,
    role: "user",
    department: "Sales Div.",
  },
  {
    name: "คุณปริญญ์",
    email: "prinn@boswell.co.th",
    phone: null,
    role: "manager",
    department: "Project Div. / Support Engineer",
  },
  {
    name: "คุณสันติ",
    email: "santi@boswell.co.th",
    phone: null,
    role: "user",
    department: "Project Div. / Support Engineer",
  },
  {
    name: "คุณฐิติกา",
    email: "thitika@boswell.co.th",
    phone: null,
    role: "manager",
    department: "Stock Div.",
  },
  {
    name: "คุณจตุพร",
    email: "jatuporn@boswell.co.th",
    phone: null,
    role: "user",
    department: "Stock Div.",
  },
  {
    name: "คุณนิราวรรณ",
    email: "services@boswell.com",
    phone: null,
    role: "manager",
    department: "Services Div.",
  },
  {
    name: "คุณณัฏฐ์",
    email: "pongphan@boswell.co.th",
    phone: null,
    role: "user",
    department: "Services Div.",
  },
] as const;

export async function up(connection: Connection) {
  const initialCredential = process.env.SEED_DEFAULT_PASSWORD;
  if (!initialCredential) {
    throw new Error("SEED_DEFAULT_PASSWORD is required to seed users");
  }

  const credentialHash = await bcrypt.hash(initialCredential, 12);
  const rows = users
    .map((_, index) =>
      index === 0
        ? "SELECT ? AS name, ? AS email, ? AS phone, ? AS role_name, ? AS department_name"
        : "SELECT ?, ?, ?, ?, ?",
    )
    .join(" UNION ALL ");
  const values = users.flatMap((user) => [
    user.name,
    user.email,
    user.phone,
    user.role,
    user.department,
  ]);

  await connection.execute(
    `INSERT INTO users (name, email, password_hash, phone, role_id, department_id, is_active)
     SELECT seed.name, seed.email, ?, seed.phone, roles.id, departments.id, 1
     FROM (${rows}) AS seed
     INNER JOIN roles ON roles.name = seed.role_name
     INNER JOIN departments ON departments.name = seed.department_name
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       role_id = VALUES(role_id),
       department_id = VALUES(department_id),
       is_active = 1,
       deleted_at = NULL`,
    [credentialHash, ...values],
  );
}
