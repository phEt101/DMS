export type FeatureCopy = {
  kicker: string
  title: string
  subtitle: string
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
  lastLogin: string
  never: string
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
  viewPermissions: string
  editPermissions: string
  permissionsFor: string
  permissionModules: Record<'dashboard' | 'documents' | 'reports' | 'trash' | 'users' | 'activity_logs', string>
}
