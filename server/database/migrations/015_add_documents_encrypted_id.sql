ALTER TABLE documents
  ADD COLUMN encrypted_id CHAR(43) NULL AFTER id,
  ADD UNIQUE KEY documents_encrypted_id_unique (encrypted_id);
