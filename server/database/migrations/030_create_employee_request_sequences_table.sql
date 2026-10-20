CREATE TABLE IF NOT EXISTS employee_request_sequences (
  company_id BIGINT UNSIGNED NOT NULL,
  prefix VARCHAR(10) NOT NULL COMMENT 'LV, OT, TF, WFH, OUT, SW',
  policy_year SMALLINT UNSIGNED NOT NULL COMMENT 'ปี พ.ศ.',
  last_no INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (company_id, prefix, policy_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ตัวนับเลขที่เอกสารรายบริษัท/ประเภท/ปี';
