import bcrypt from "bcryptjs";
import type { Connection, RowDataPacket } from "mysql2/promise";

// ผู้ใช้ทดสอบสำหรับ Big money และ Boswell Digital
// ใช้เพื่อทดสอบว่า flow ต่าง ๆ (เอกสาร/การอนุมัติตามบทบาท) ถูกต้องตั้งแต่เริ่มต้นเท่านั้น
// ทุกบริษัทมีแผนก HR Div. แน่นอน และเพิ่มแผนกอื่นอีก 1 แผนกเพื่อให้ทดสอบได้หลากหลาย

const testDepartments = ["HR Div.", "Sales Div."] as const;

const testUsers = [
  // Big money — ครบทั้ง executive / manager / user
  {
    name: "คุณทดสอบ บิ๊กมันนี่ เอ็กซ์คิวทีฟ",
    firstName: "ทดสอบ",
    lastName: "บิ๊กมันนี่",
    email: "executive@bigmoney.co.th",
    role: "executive",
    department: "HR Div.",
    company: "Big money",
  },
  {
    name: "คุณทดสอบ บิ๊กมันนี่ แมเนเจอร์",
    firstName: "ทดสอบ",
    lastName: "บิ๊กมันนี่",
    email: "manager@bigmoney.co.th",
    role: "manager",
    department: "HR Div.",
    company: "Big money",
  },
  {
    name: "คุณทดสอบ บิ๊กมันนี่ ยูเซอร์",
    firstName: "ทดสอบ",
    lastName: "บิ๊กมันนี่",
    email: "user@bigmoney.co.th",
    role: "user",
    department: "Sales Div.",
    company: "Big money",
  },
  // Boswell Digital — ครบทั้ง executive / manager / user
  {
    name: "คุณทดสอบ ดิจิทัล เอ็กซ์คิวทีฟ",
    firstName: "ทดสอบ",
    lastName: "ดิจิทัล",
    email: "executive@boswelldigital.co.th",
    role: "executive",
    department: "HR Div.",
    company: "Boswell Digital",
  },
  {
    name: "คุณทดสอบ ดิจิทัล แมเนเจอร์",
    firstName: "ทดสอบ",
    lastName: "ดิจิทัล",
    email: "manager@boswelldigital.co.th",
    role: "manager",
    department: "HR Div.",
    company: "Boswell Digital",
  },
  {
    name: "คุณทดสอบ ดิจิทัล ยูเซอร์",
    firstName: "ทดสอบ",
    lastName: "ดิจิทัล",
    email: "user@boswelldigital.co.th",
    role: "user",
    department: "Sales Div.",
    company: "Boswell Digital",
  },
] as const;

export async function up(connection: Connection) {
  // 1) แผนกสำหรับสองบริษัท (มี HR Div. แน่นอน)
  const [companyRows] = await connection.query(
    `SELECT id, name FROM companies WHERE name IN ('Big money', 'Boswell Digital') AND deleted_at IS NULL`,
  ) as [ (RowDataPacket & { id: number; name: string })[], unknown ];
  const companies = companyRows.map((row) => ({ id: Number(row.id), name: String(row.name) }))
  if (companies.length === 0) {
    throw new Error("Big money and Boswell Digital companies are required before seeding test users")
  }

  await connection.query(
    `INSERT INTO departments (company_id, name, is_active)
     VALUES ?
     ON DUPLICATE KEY UPDATE is_active = 1, deleted_at = NULL`,
    [companies.flatMap((company) => testDepartments.map((name) => [company.id, name, 1]))],
  )

  // 2) ผู้ใช้ทดสอบ — รหัสผ่านใช้ SEED_DEFAULT_PASSWORD เดียวกันกับผู้ใช้อื่น
  const initialCredential = process.env.SEED_DEFAULT_PASSWORD;
  if (!initialCredential) {
    throw new Error("SEED_DEFAULT_PASSWORD is required to seed users");
  }
  const credentialHash = await bcrypt.hash(initialCredential, 12);

  const rows = testUsers
    .map((_, index) =>
      index === 0
        ? "SELECT ? AS name, ? AS first_name, ? AS last_name, ? AS email, ? AS role_name, ? AS department_name, ? AS company_name"
        : "SELECT ?, ?, ?, ?, ?, ?, ?",
    )
    .join(" UNION ALL ");
  const values = testUsers.flatMap((user) => [
    user.name,
    user.firstName,
    user.lastName,
    user.email,
    user.role,
    user.department,
    user.company,
  ]);

  await connection.execute(
    `INSERT INTO users
       (name, first_name, last_name, email, password_hash, role_id, department_id, company_id, is_active)
     SELECT seed.name, seed.first_name, seed.last_name, seed.email, ?,
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
  )

  // 3) โควตาลาเริ่มต้น 30/3/3/0 ให้ผู้ใช้ทดสอบ (เหมือน 013_leave_balances) เพื่อให้ flow เอกสารใช้ได้ทันที
  await connection.execute(
    `INSERT INTO employees (user_id, sick_leave_days, personal_leave_days, vacation_leave_days, other_leave_days)
     SELECT id, 30, 3, 3, 0 FROM users
     WHERE email LIKE '%@bigmoney.co.th' OR email LIKE '%@boswelldigital.co.th'
     ON DUPLICATE KEY UPDATE
       sick_leave_days = COALESCE(sick_leave_days, 30),
       personal_leave_days = COALESCE(personal_leave_days, 3),
       vacation_leave_days = COALESCE(vacation_leave_days, 3),
       other_leave_days = COALESCE(other_leave_days, 0)`,
  )
}
