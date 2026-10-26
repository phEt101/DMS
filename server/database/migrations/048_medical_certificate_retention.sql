-- เก็บไฟล์ใบรับรองแพทย์ของเอกสารที่ถูกยกเลิก/ไม่อนุมัติไว้อีก 30 วัน ก่อนลบไฟล์จริง
ALTER TABLE employee_request_medical_certificates
  ADD COLUMN disposal_status ENUM('active','retained') NOT NULL DEFAULT 'active'
    COMMENT 'active = ใช้งานปกติ, retained = เอกสารถูกยกเลิก/ไม่อนุมัติ รอลบหลัง 30 วัน' AFTER uploaded_by,
  ADD COLUMN disposal_at DATETIME NULL
    COMMENT 'วันเวลาที่ครบกำหนดลบไฟล์จริง (สิ้นสุดการเก็บรักษา 30 วัน)' AFTER disposal_status,
  ADD COLUMN moved_at DATETIME NULL
    COMMENT 'วันเวลาที่ย้ายไฟล์ไปโฟลเดอร์พักรอลบ' AFTER disposal_at,
  ADD KEY employee_request_medical_certificates_disposal_index (disposal_status, disposal_at)
