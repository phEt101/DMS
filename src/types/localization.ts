export type FeatureCopy = {
  kicker: string
  title: string
  subtitle: string
}

export type ActivityFeatureCopy = FeatureCopy & {
  sequence: string
  user: string
  email: string
  activity: string
  module: string
  details: string
  ipAddress: string
  dateTime: string
  login: string
  logout: string
  created: string
  updated: string
  deleted: string
  activated: string
  deactivated: string
  submitted: string
  approved: string
  rejected: string
  cancelled: string
  policyUpdated: string
  loginFrom: string
  onDevice: string
  unknownClient: string
  modules: Record<string, string>
  changedFields: string
  permissionCount: string
  fields: Record<string, string>
  userActions: Record<string, string>
  roleActions: Record<string, string>
  departmentActions: Record<string, string>
  permissionActions: Record<string, string>
  moduleActions: Record<string, string>
  companyActions: Record<string, string>
  documentActions: Record<string, string>
  documentKinds: Record<string, string>
  documentStatuses: Record<string, string>
  approvalStages: Record<string, string>
  policyFields: Record<string, string>
  requestNumber: string
  documentType: string
  status: string
  approvalStage: string
  projectActions: Record<string, string>
  projectFields: Record<string, string>
  surveyActions: Record<string, string>
  surveyFields: Record<string, string>
  surveyValues: Record<string, string>
  rolePermissionModules: string
  roleActivated: string
  roleDeactivated: string
  from: string
  to: string
  passwordChanged: string
  active: string
  inactive: string
  unknownUser: string
  loading: string
  empty: string
  loadError: string
}

export type UserFeatureCopy = FeatureCopy & {
  addUser: string
  newUser: string
  searchPlaceholder: string
  statusFilter: string
  allStatuses: string
  userRoleFilter: string
  allRoles: string
  departmentFilter: string
  allDepartments: string
  active: string
  inactive: string
  users: string
  name: string
  firstName: string
  lastName: string
  company: string
  companyLogo: string
  companyLogoHelp: string
  companyManagement: string
  companyHelp: string
  addCompany: string
  newCompany: string
  companySearchPlaceholder: string
  noCompanies: string
  deleteCompanyConfirm: string
  deleteCompanyError: string
  companyLoadError: string
  companySaveError: string
  email: string
  password: string
  passwordOptional: string
  department: string
  phone: string
  role: string
  status: string
  createdAt: string
  actions: string
  deleteConfirm: string
  activeUser: string
  saving: string
  loading: string
  empty: string
  loadError: string
  saveError: string
  deleteError: string
  roles: Record<string, string>
  userTab: string
  roleTab: string
  departmentTab: string
  permissionTab: string
  departmentManagement: string
  departmentHelp: string
  departmentSearchPlaceholder: string
  companyFilter: string
  allCompanies: string
  permissionManagement: string
  permissionHelp: string
  permissionSearchPlaceholder: string
  moduleFilter: string
  allModules: string
  accessManagement: string
  accessHelp: string
  moduleManagement: string
  moduleHelp: string
  moduleSearchPlaceholder: string
  noModules: string
  sortOrder: string
  iconName: string
  permissionsCount: string
  addModule: string
  editModule: string
  addDepartment: string
  editDepartment: string
  addPermission: string
  editPermission: string
  noDepartments: string
  noPermissions: string
  description: string
  module: string
  members: string
  assignedRoles: string
  totalPermissions: string
  roleManagement: string
  roleHelp: string
  roleSearchPlaceholder: string
  addRole: string
  newRole: string
  noRoles: string
  selectPermissions: string
  selectAllPermissions: string
  selectAllModule: string
  viewPermissions: string
  editPermissions: string
  deleteRoleConfirm: string
  deleteRoleError: string
  permissionsFor: string
  permissionModules: Record<'dashboard' | 'projects' | 'projects_cm' | 'survey' | 'documents' | 'documents_pending' | 'documents_ledger' | 'report' | 'documents_employees' | 'documents_policy' | 'documents_notifications' | 'users' | 'roles' | 'departments' | 'permissions' | 'modules' | 'companies' | 'activity_logs', string>
}
