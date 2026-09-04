export const roles: Array<readonly [string, string]> = [
  ['admin', 'Full system access'],
  ['manager', 'Manage documents and view reports'],
  ['user', 'Create and manage assigned documents'],
  ['viewer', 'Read-only access'],
]

export const departments = [
  'IT / System',
  'Project Management',
  'Field Service',
  'Management',
] as const

export const permissionModules: Array<readonly [string, string]> = [
  ['dashboard', 'FaTableCellsLarge'],
  ['documents', 'FaFileLines'],
  ['reports', 'FaChartColumn'],
  ['trash', 'FaTrashCan'],
  ['users', 'FaUser'],
  ['roles', 'FaShieldHalved'],
  ['departments', 'FaBuilding'],
  ['permissions', 'FaKey'],
  ['modules', 'FaLayerGroup'],
  ['activity_logs', 'FaWaveSquare'],
]

export const permissions: Array<readonly [string, string]> = [
  ['ดูแดชบอร์ด', 'dashboard'],
  ['ดูเอกสาร', 'documents'],
  ['สร้างเอกสาร', 'documents'],
  ['แก้ไขเอกสาร', 'documents'],
  ['ลบเอกสาร', 'documents'],
  ['กู้คืนเอกสาร', 'trash'],
  ['ดูรายงาน', 'reports'],
  ['ดูผู้ใช้งาน', 'users'],
  ['สร้างผู้ใช้งาน', 'users'],
  ['แก้ไขผู้ใช้งาน', 'users'],
  ['ลบผู้ใช้งาน', 'users'],
  ['จัดการบทบาทและสิทธิ์', 'roles'],
  ['จัดการแผนก', 'departments'],
  ['ดูบันทึกกิจกรรม', 'activity_logs'],
]

export const rolePermissions: Record<string, readonly string[]> = {
  admin: permissions.map(([name]) => name),
  manager: [
    'ดูแดชบอร์ด', 'ดูเอกสาร', 'สร้างเอกสาร', 'แก้ไขเอกสาร',
    'ลบเอกสาร', 'กู้คืนเอกสาร', 'ดูรายงาน', 'ดูบันทึกกิจกรรม',
  ],
  user: ['ดูแดชบอร์ด', 'ดูเอกสาร', 'สร้างเอกสาร', 'แก้ไขเอกสาร'],
  viewer: ['ดูแดชบอร์ด', 'ดูเอกสาร'],
}
