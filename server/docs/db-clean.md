# `db:clean` — ล้างข้อมูลแบบเลือกตารางได้

Script สำหรับล้างข้อมูล (TRUNCATE) ใน MySQL โดยเลือกตารางได้เอง เหมาะกับสถานการณ์ที่ไม่อยากลบฐานข้อมูลทั้งหมดแบบ `db:fresh` แต่อยากล้างเฉพาะข้อมูล transaction/test ที่ไม่จำเป็น

ไฟล์: `server/scripts/clean.ts`

## การใช้งาน

รันจาก `server/` (ไม่ต้องใส่ `--prefix`):

```bash
npm run db:clean -- --only=surveys,activity_logs
```

หรือจาก root ของโปรเจกต์ (`DMS/`):

```bash
npm run db:clean -- --only=surveys,activity_logs
```

หรือรันตรง ๆ:

```bash
npx tsx scripts/clean.ts --only=surveys,activity_logs
```

## ตัวเลือก (Options)

| ตัวเลือก | คำอธิบาย |
| --- | --- |
| `--only=t1,t2` | ล้างเฉพาะตารางที่ระบุ (คั่นด้วย comma) |
| `--exclude=t1,t2` | ล้างทุกตาราง ยกเว้นตารางที่ระบุ (นอกจากตารางที่ป้องกันอยู่แล้ว) |
| `--dry-run` | แสดงว่าจะล้างตารางไหนโดยไม่ลบจริง (แนะนำให้รันก่อนทุกครั้ง) |
| `--force` | จำเป็นเมื่อ `NODE_ENV=production` |
| (ไม่ใส่อะไรเลย) | ล้างทุกตาราง ยกเว้นตารางที่ป้องกันไว้ (เท่ากับ `--all`) |

## ตารางที่ป้องกันไว้เสมอ (Protected Tables)

ตารางเหล่านี้จะ**ไม่ถูกล้าง**เด็ดขาด แม้ระบุชื่อใน `--only` ก็จะถูกปฏิเสธ:

| ตาราง | เหตุผล |
| --- | --- |
| `users` | บัญชีผู้ใช้จริง |
| `employees` | ข้อมูลพนักงานจริง |
| `migrations` | tracking ของ migration — ถ้าล้าง `db:migrate` จะรันซ้ำ |
| `schema_migrations` | tracking ของ migration (รูปแบบอื่น) |
| `database_seeders` | tracking ของ seeder — ถ้าล้าง `db:seed` จะรันซ้ำ |

## กติกาความปลอดภัย

- ห้ามใช้ `--only` กับ `--exclude` พร้อมกัน
- ชื่อตารางที่ไม่มีอยู่จริงในฐานข้อมูล → แจ้ง error ทันที (กันพิมพ์ผิดแล้วคิดว่าล้างไปแล้ว)
- ระบุตารางที่ป้องกันไว้ใน `--only` → ถูกปฏิเสธพร้อมบอกชื่อตารางที่ห้ามล้าง
- ใส่ flag ที่ไม่รู้จัก → แจ้ง error พร้อมรายการ flag ที่ใช้ได้
- ระหว่างล้างจะปิด `FOREIGN_KEY_CHECKS = 0` ชั่วคราว แล้วเปิดคืนตอนจบ (ไม่ติด FK constraint)
- `NODE_ENV=production` ต้องใส่ `--force` จึงจะรันได้

## ตัวอย่าง

```bash
# ดูก่อนว่าจะล้างอะไร
npm run db:clean -- --only=surveys,activity_logs --dry-run

# ล้างเฉพาะ survey + activity log
npm run db:clean -- --only=surveys,activity_logs

# ล้างทุกตารางที่ไม่ป้องกัน ยกเว้น projects กับ roles
npm run db:clean -- --exclude=projects,roles

# ล้างทุกตารางที่ไม่ป้องกัน
npm run db:clean

# production
NODE_ENV=production npm run db:clean -- --only=surveys --force
```

## ตัวอย่างผลลัพธ์

```text
[dry-run] would truncate 2 table(s):
 - surveys
 - activity_logs
[dry-run] preserved: announcement_attachments, ..., employees, users, ...
```

## หมายเหตุการส่ง argument ผ่าน npm

`db:clean` ใช้ `sh -c` ภายใน จึงต้องมี `--` ปิดท้ายใน npm script (`... clean.ts "$@"; fi' --`) เพื่อให้ argument หลัง `npm run db:clean --` ถูกส่งต่อถึง script จริง หากเพิ่ม npm script ใหม่ที่ต้องรับ args ด้วย `sh -c` อย่าลืมใส่ `--` เช่นเดียวกัน มิฉะนั้น `--only=` จะถูกทิ้งและ script จะรันแบบ default (ล้างทุกตารางที่ไม่ป้องกัน)

## ข้อควรระวัง

- `TRUNCATE` รีเซ็ต AUTO_INCREMENT ด้วย — id จะเริ่มนับใหม่เป็น 1
- บางตารางเป็นข้อมูล master ที่ seeder ใส่ให้ เช่น `companies`, `roles`, `permissions`, `departments`, `project_types` ถ้าล้างไปแล้วอยากเติมกลับ ต้องลบ record ออกจาก `database_seeders` ก่อนแล้วรัน `db:seed` ใหม่:

  ```sql
  DELETE FROM database_seeders WHERE name IN ('000_companies.ts', '001_roles.ts');
  ```

  ```bash
  npm run db:seed
  ```

- ถ้ามี FK ชี้จากตารางที่คงไว้ (เช่น `users`) ไปยังตารางที่ล้าง (เช่น `departments`) ข้อมูลอ้างอิงจะชี้ไปยังแถวที่ไม่มีอยู่อีกต่อไป
- TRUNCATE ทำใน transaction ไม่ได้ (MySQL) — ล้างไปแล้ว rollback ไม่ได้ จึงควรรัน `--dry-run` ก่อนเสมอ
