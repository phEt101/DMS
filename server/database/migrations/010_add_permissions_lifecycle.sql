ALTER TABLE permissions
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER module,
  ADD COLUMN deleted_at TIMESTAMP NULL AFTER updated_at,
  ADD KEY permissions_deleted_at_index (deleted_at);
