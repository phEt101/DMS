export const roles: Array<readonly [string, string]> = [
  ['admin', 'Full system access'],
  ['executive', 'Executive access with user and project management'],
  ['manager', 'Manage projects and view reports'],
  ['user', 'Create and manage assigned projects'],
]

export const departments = [
  'Managing Director',
  'Deputy Managing Director',
  'Financial, Accounting Div.',
  'HR Div.',
  'Safety Div.',
  'Procurement Div.',
  'IT Div.',
  'Sales Div.',
  'Project Div. / Support Engineer',
  'Stock Div.',
  'Services Div.',
] as const

export const permissionModules: Array<readonly [string, string]> = [
  ['dashboard', 'FaTableCellsLarge'],
  ['projects', 'FaDiagramProject'],
  ['projects_cm', 'FaDiagramProject'],
  ['survey', 'FaClipboardList'],
  ['documents', 'FaFolderOpen'],
  ['documents_pending', 'FaClock'],
  ['documents_ledger', 'FaBook'],
  ['report', 'FaChartColumn'],
  ['documents_employees', 'FaUsers'],
  ['documents_policy', 'FaSliders'],
  ['documents_notifications', 'FaBell'],
  ['users', 'FaUser'],
  ['roles', 'FaShieldHalved'],
  ['departments', 'FaBuilding'],
  ['permissions', 'FaKey'],
  ['modules', 'FaLayerGroup'],
  ['companies', 'FaBuilding'],
  ['activity_logs', 'FaWaveSquare'],
]

export const permissions: Array<readonly [string, string]> = [
  ['สร้างโครงการ', 'projects'],
  ['แก้ไขโครงการ', 'projects'],
  ['ลบโครงการ', 'projects'],
  ['สร้างผู้ใช้งาน', 'users'],
  ['แก้ไขผู้ใช้งาน', 'users'],
  ['ลบผู้ใช้งาน', 'users'],
  ['เพิ่มบทบาท', 'roles'],
  ['แก้ไขบทบาทและสิทธิ์', 'roles'],
  ['ลบบทบาท', 'roles'],
  ['เพิ่มแผนก', 'departments'],
  ['แก้ไขแผนก', 'departments'],
  ['ลบแผนก', 'departments'],
  ['เพิ่มสิทธิ์', 'permissions'],
  ['แก้ไขสิทธิ์', 'permissions'],
  ['ลบสิทธิ์', 'permissions'],
  ['เพิ่มโมดูล', 'modules'],
  ['แก้ไขโมดูล', 'modules'],
  ['ลบโมดูล', 'modules'],
  ['เพิ่มบริษัท', 'companies'],
  ['แก้ไขบริษัท', 'companies'],
  ['ลบบริษัท', 'companies'],
]

export const rolePermissions: Record<string, readonly string[]> = {
  admin: permissions.map(([name]) => name),
  executive: [
    'สร้างโครงการ', 'แก้ไขโครงการ', 'ลบโครงการ',
    'สร้างผู้ใช้งาน', 'แก้ไขผู้ใช้งาน', 'ลบผู้ใช้งาน',
  ],
  manager: ['สร้างโครงการ', 'แก้ไขโครงการ', 'ลบโครงการ'],
  user: ['สร้างโครงการ', 'แก้ไขโครงการ'],
}
