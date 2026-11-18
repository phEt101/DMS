-- เพิ่ม event การแจ้งเตือน "HR แก้ไขวันลา"
ALTER TABLE employee_request_notifications
  MODIFY COLUMN event ENUM('submitted','forwarded_to_hr','forwarded_to_exec','approved','rejected','cancelled','leave_dates_edited') NOT NULL;
