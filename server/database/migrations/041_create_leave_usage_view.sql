CREATE OR REPLACE VIEW v_leave_usage AS
SELECT
  d.employee_user_id,
  d.start_date,
  lt.code AS leave_type_code,
  lt.balance_bucket,
  CASE WHEN d.status = 'approved' THEN COALESCE(d.days, 0) ELSE 0 END AS used_approved,
  CASE WHEN d.status IN ('pending_mgr','pending_exec','pending_hr','approved') THEN COALESCE(d.days, 0) ELSE 0 END AS used_reserved
FROM employee_requests d
JOIN employee_request_leave_details dl ON dl.request_id = d.id
JOIN leave_types lt ON lt.id = dl.leave_type_id
WHERE d.kind = 'leave';
