UPDATE roles SET name = code;

ALTER TABLE departments
  DROP INDEX departments_code_unique,
  DROP COLUMN code;

ALTER TABLE roles
  DROP INDEX roles_code_unique,
  ADD UNIQUE KEY roles_name_unique (name),
  DROP COLUMN code;

ALTER TABLE permissions
  DROP INDEX permissions_code_unique,
  ADD UNIQUE KEY permissions_module_name_unique (module, name),
  DROP COLUMN code;
