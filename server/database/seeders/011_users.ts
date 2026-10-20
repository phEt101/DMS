import bcrypt from "bcryptjs";
import type { Connection } from "mysql2/promise";

const users = [
  {
    name: "คุณกีรติ",
    firstName: "กีรติ",
    lastName: "-",
    email: "keerati@boswell.co.th",
    phone: null,
    role: "executive",
    department: "Managing Director",
    company: "Boswell",
  },
  {
    name: "คุณสมเกียรติ",
    firstName: "สมเกียรติ",
    lastName: "-",
    email: "somkiat@boswell.co.th",
    phone: null,
    role: "manager",
    department: "Deputy Managing Director",
    company: "Boswell",
  },
  {
    name: "คุณอัยลดา",
    firstName: "อัยลดา",
    lastName: "-",
    email: "ailada@boswell.co.th",
    phone: null,
    role: "manager",
    department: "Financial, Accounting Div.",
    company: "Boswell",
  },
  {
    name: "คุณนัฐริณีย์",
    firstName: "นัฐริณีย์",
    lastName: "-",
    email: "nuttarinee@boswell.co.th",
    phone: null,
    role: "user",
    department: "Financial, Accounting Div.",
    company: "Boswell",
  },
  {
    name: "คุณวราภรณ์",
    firstName: "วราภรณ์",
    lastName: "-",
    email: "waraporn@boswell.co.th",
    phone: null,
    role: "user",
    department: "Financial, Accounting Div.",
    company: "Boswell",
  },
  {
    name: "คุณชัญญานุช",
    firstName: "ชัญญานุช",
    lastName: "-",
    email: "chanyanuch@boswell.co.th",
    phone: null,
    role: "manager",
    department: "HR Div.",
    company: "Boswell",
  },
  {
    name: "คุณมนัส",
    firstName: "มนัส",
    lastName: "-",
    email: "manat@boswell.co.th",
    phone: null,
    role: "user",
    department: "HR Div.",
    company: "Boswell",
  },
  {
    name: "คุณเคียงเดือน",
    firstName: "เคียงเดือน",
    lastName: "-",
    email: "duan@boswell.co.th",
    phone: null,
    role: "manager",
    department: "Procurement Div.",
    company: "Boswell",
  },
  {
    name: "คุณกฤษณา",
    firstName: "กฤษณา",
    lastName: "-",
    email: "krissana@boswell.co.th",
    phone: null,
    role: "user",
    department: "Procurement Div.",
    company: "Boswell",
  },
  {
    name: "คุณศุภฤกษ์",
    firstName: "ศุภฤกษ์",
    lastName: "-",
    email: "suparerk@boswell.co.th",
    phone: null,
    role: "manager",
    department: "IT Div.",
    company: "Boswell",
  },
  {
    name: "คุณทักษ์ดนัย",
    firstName: "ทักษ์ดนัย",
    lastName: "-",
    email: "takdanai@boswell.co.th",
    phone: null,
    role: "user",
    department: "IT Div.",
    company: "Boswell",
  },
  {
    name: "คุณสมบุญ",
    firstName: "สมบุญ",
    lastName: "-",
    email: "somboon@boswell.co.th",
    phone: null,
    role: "manager",
    department: "Sales Div.",
    company: "Boswell",
  },
  {
    name: "คุณสุภาวดี",
    firstName: "สุภาวดี",
    lastName: "-",
    email: "supawadee@boswell.co.th",
    phone: null,
    role: "user",
    department: "Sales Div.",
    company: "Boswell",
  },
  {
    name: "คุณปริญญ์",
    firstName: "ปริญญ์",
    lastName: "-",
    email: "prinn@boswell.co.th",
    phone: null,
    role: "manager",
    department: "Project Div. / Support Engineer",
    company: "Boswell",
  },
  {
    name: "คุณสันติ",
    firstName: "สันติ",
    lastName: "-",
    email: "santi@boswell.co.th",
    phone: null,
    role: "user",
    department: "Project Div. / Support Engineer",
    company: "Boswell",
  },
  {
    name: "คุณฐิติกา",
    firstName: "ฐิติกา",
    lastName: "-",
    email: "thitika@boswell.co.th",
    phone: null,
    role: "manager",
    department: "Stock Div.",
    company: "Boswell",
  },
  {
    name: "คุณจตุพร",
    firstName: "จตุพร",
    lastName: "-",
    email: "jatuporn@boswell.co.th",
    phone: null,
    role: "user",
    department: "Stock Div.",
    company: "Boswell",
  },
  {
    name: "คุณนิราวรรณ",
    firstName: "นิราวรรณ",
    lastName: "-",
    email: "services@boswell.com",
    phone: null,
    role: "manager",
    department: "Services Div.",
    company: "Boswell",
  },
  {
    name: "คุณณัฏฐ์",
    firstName: "ณัฏฐ์",
    lastName: "-",
    email: "pongphan@boswell.co.th",
    phone: null,
    role: "user",
    department: "Services Div.",
    company: "Boswell",
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
        ? "SELECT ? AS name, ? AS first_name, ? AS last_name, ? AS email, ? AS phone, ? AS role_name, ? AS department_name, ? AS company_name"
        : "SELECT ?, ?, ?, ?, ?, ?, ?, ?",
    )
    .join(" UNION ALL ");
  const values = users.flatMap((user) => [
    user.name,
    user.firstName,
    user.lastName,
    user.email,
    user.phone,
    user.role,
    user.department,
    user.company,
  ]);

  await connection.execute(
    `INSERT INTO users
       (name, first_name, last_name, email, password_hash, phone, role_id, department_id, company_id, is_active)
     SELECT seed.name, seed.first_name, seed.last_name, seed.email, ?, seed.phone,
            roles.id, departments.id, companies.id, 1
     FROM (${rows}) AS seed
     INNER JOIN roles ON roles.name = seed.role_name
     INNER JOIN companies ON companies.name = seed.company_name
     INNER JOIN departments ON departments.company_id = companies.id AND departments.name = seed.department_name
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       first_name = VALUES(first_name),
       last_name = VALUES(last_name),
       role_id = VALUES(role_id),
       department_id = VALUES(department_id),
       company_id = VALUES(company_id),
       is_active = 1,
       deleted_at = NULL`,
    [credentialHash, ...values],
  );
}
