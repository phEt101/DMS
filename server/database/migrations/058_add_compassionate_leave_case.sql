ALTER TABLE employee_request_leave_details
  ADD COLUMN compassionate_relation VARCHAR(30) NULL
    COMMENT 'กรณีลาเมตตาจิต: spouse, child หรือ employee_parent';
