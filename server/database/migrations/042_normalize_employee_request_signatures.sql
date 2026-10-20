CREATE TABLE IF NOT EXISTS signature_images (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  content_hash CHAR(64) NOT NULL,
  signature_image MEDIUMTEXT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY signature_images_hash_unique (content_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ลายเซ็นที่จัดเก็บเพียงครั้งเดียวและใช้ร่วมกันผ่าน foreign key';

ALTER TABLE employee_request_signatures
  ADD COLUMN signature_file_id BIGINT UNSIGNED NULL AFTER signer_name;

ALTER TABLE user_saved_signatures
  ADD COLUMN signature_file_id BIGINT UNSIGNED NULL AFTER user_id;

INSERT INTO signature_images (content_hash, signature_image)
SELECT SHA2(source.signature_image, 256), source.signature_image
  FROM (
    SELECT signature_image FROM employee_request_signatures WHERE signature_image IS NOT NULL
    UNION
    SELECT signature_image FROM user_saved_signatures
  ) source
ON DUPLICATE KEY UPDATE content_hash = VALUES(content_hash);

UPDATE employee_request_signatures request_signature
JOIN signature_images image ON image.content_hash = SHA2(request_signature.signature_image, 256)
   SET request_signature.signature_file_id = image.id
 WHERE request_signature.signature_image IS NOT NULL;

UPDATE user_saved_signatures saved_signature
JOIN signature_images image ON image.content_hash = SHA2(saved_signature.signature_image, 256)
   SET saved_signature.signature_file_id = image.id;

ALTER TABLE employee_request_signatures
  DROP COLUMN signature_image,
  ADD KEY employee_request_signatures_signature_file_index (signature_file_id),
  ADD CONSTRAINT employee_request_signatures_signature_file_fk
    FOREIGN KEY (signature_file_id) REFERENCES signature_images (id);

ALTER TABLE user_saved_signatures
  MODIFY signature_file_id BIGINT UNSIGNED NOT NULL,
  DROP COLUMN signature_image,
  ADD KEY user_saved_signatures_signature_file_index (signature_file_id),
  ADD CONSTRAINT user_saved_signatures_signature_file_fk
    FOREIGN KEY (signature_file_id) REFERENCES signature_images (id);
