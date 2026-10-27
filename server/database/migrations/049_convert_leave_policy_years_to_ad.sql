-- Convert existing Buddhist Era policy years to Gregorian/AD years.
-- Existing employee request numbers and their sequence history are preserved.
UPDATE leave_policies
   SET policy_year = policy_year - 543
 WHERE policy_year BETWEEN 2500 AND 2700;

ALTER TABLE leave_policies
  MODIFY policy_year SMALLINT UNSIGNED NOT NULL COMMENT 'Policy year (AD)';
