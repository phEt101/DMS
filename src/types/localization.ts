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
  previous: string
  next: string
  page: string
  perPage: string
  loadError: string
}

export type UserFeatureCopy = FeatureCopy & {
  addUser: string
  newUser: string
  searchPlaceholder: string
  statusFilter: string
  allStatuses: string
  active: string
  inactive: string
  users: string
  name: string
  email: string
  password: string
  passwordOptional: string
  department: string
  phone: string
  role: string
  status: string
  createdAt: string
  actions: string
  edit: string
  delete: string
  deleteConfirm: string
  activeUser: string
  cancel: string
  save: string
  saving: string
  loading: string
  empty: string
  previous: string
  next: string
  page: string
  perPage: string
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
  permissionManagement: string
  permissionHelp: string
  accessManagement: string
  accessHelp: string
  moduleManagement: string
  moduleHelp: string
  noModules: string
  sortOrder: string
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
  permissionModules: Record<'dashboard' | 'documents' | 'reports' | 'trash' | 'users' | 'activity_logs', string>
}
