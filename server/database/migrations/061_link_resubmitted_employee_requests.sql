ALTER TABLE employee_requests
  ADD COLUMN resubmitted_from_id BIGINT UNSIGNED NULL AFTER reason,
  ADD KEY employee_requests_resubmitted_from_index (resubmitted_from_id),
  ADD CONSTRAINT employee_requests_resubmitted_from_fk
    FOREIGN KEY (resubmitted_from_id) REFERENCES employee_requests (id) ON DELETE SET NULL;
