CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'รหัสเซสชัน',
    user_id BIGINT UNSIGNED NOT NULL COMMENT 'รหัสผู้ใช้งานเจ้าของเซสชัน',
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'ค่า SHA-256 ของโทเคนเซสชัน',
    expires_at DATETIME NOT NULL COMMENT 'วันที่และเวลาที่เซสชันหมดอายุ',
    last_used_at DATETIME NULL COMMENT 'วันที่และเวลาที่ใช้งานเซสชันล่าสุด',
    ip_address VARCHAR(45) NULL COMMENT 'หมายเลข IP ที่สร้างเซสชัน รองรับ IPv4 และ IPv6',
    user_agent VARCHAR(500) NULL COMMENT 'ข้อมูลเบราว์เซอร์หรืออุปกรณ์ที่สร้างเซสชัน',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่และเวลาที่สร้างเซสชัน',
    revoked_at DATETIME NULL COMMENT 'วันที่และเวลาที่ยกเลิกเซสชัน; NULL=ยังไม่ถูกยกเลิก',
    PRIMARY KEY (id),
    UNIQUE KEY user_sessions_token_hash_unique (token_hash),
    KEY user_sessions_user_id_index (user_id),
    KEY user_sessions_expires_at_index (expires_at),
    CONSTRAINT user_sessions_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
  COMMENT='เซสชันสำหรับยืนยันตัวตนของผู้ใช้งาน';
