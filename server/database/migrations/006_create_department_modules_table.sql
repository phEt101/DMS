CREATE TABLE IF NOT EXISTS department_modules (
  department_id BIGINT UNSIGNED NOT NULL,
  module_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (department_id, module_id),
  KEY department_modules_module_index (module_id),
  CONSTRAINT department_modules_department_fk FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE CASCADE,
  CONSTRAINT department_modules_module_fk FOREIGN KEY (module_id) REFERENCES permission_modules (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='โมดูลเมนูที่แต่ละแผนกสามารถมองเห็น';
