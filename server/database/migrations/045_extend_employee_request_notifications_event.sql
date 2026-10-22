ALTER TABLE employee_request_notifications
  MODIFY event ENUM('submitted','forwarded_to_hr','forwarded_to_exec','approved','rejected','cancelled') NOT NULL
    COMMENT 'ฝั่งฟรอนต์ใช้ event + ข้อมูลเอกสารสร้างข้อความตามภาษา';
