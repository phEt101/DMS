-- Remove signature images no longer referenced by a request or a user's saved signature.
DELETE FROM signature_images
 WHERE NOT EXISTS (
   SELECT 1 FROM employee_request_signatures
    WHERE employee_request_signatures.signature_file_id = signature_images.id
 )
   AND NOT EXISTS (
     SELECT 1 FROM user_saved_signatures
      WHERE user_saved_signatures.signature_file_id = signature_images.id
   );
