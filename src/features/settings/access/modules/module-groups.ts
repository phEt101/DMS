type PermissionModuleGroupLabelKey =
  | "moduleGroupGeneral"
  | "moduleGroupProjects"
  | "moduleGroupDocuments"
  | "moduleGroupSettings";

export const permissionModuleGroupDefinitions: Array<{
  labelKey: PermissionModuleGroupLabelKey;
  keys: readonly string[];
}> = [
  { labelKey: "moduleGroupGeneral", keys: ["dashboard"] },
  { labelKey: "moduleGroupProjects", keys: ["projects", "projects_cm", "survey"] },
  {
    labelKey: "moduleGroupDocuments",
    keys: [
      "documents",
      "documents_pending",
      "documents_ledger",
      "report",
      "documents_employees",
      "documents_policy",
      "documents_flow_rules",
      "documents_notifications",
      "documents_payslips",
      "announcements",
    ],
  },
  {
    labelKey: "moduleGroupSettings",
    keys: ["users", "roles", "departments", "permissions", "modules", "companies", "activity_logs"],
  },
];

export const moduleLabels: Record<string, string> = {
  dashboard: "แดชบอร์ด",
  projects: "PM",
  projects_cm: "CM",
  survey: "Survey",
  documents: "รายการใบลา",
  documents_pending: "รออนุมัติ",
  documents_ledger: "สมุดบันทึกการลา",
  report: "รายงานออกนอกสถานที่",
  documents_employees: "พนักงาน",
  documents_policy: "นโยบายการลา",
  documents_flow_rules: "กำหนดสิทธิ์ในการยื่นเอกสาร",
  documents_notifications: "แจ้งเตือน",
  documents_payslips: "สลิปเงินเดือน",
  users: "ผู้ใช้งาน",
  roles: "บทบาทและสิทธิ์",
  departments: "จัดการแผนก",
  permissions: "สิทธิ์",
  modules: "โมดูล",
  companies: "บริษัท",
  activity_logs: "บันทึกกิจกรรม",
};
