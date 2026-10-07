export const roles: Array<readonly [string, string]> = [
  ['admin', 'Full system access'],
  ['manager', 'Manage projects and view reports'],
  ['user', 'Create and manage assigned projects'],
  ['viewer', 'Read-only access'],
]

export const departments = [
  'IT / System',
  'Project Management',
  'Service',
  'Management',
] as const

export const permissionModules: Array<readonly [string, string]> = [
  ['dashboard', 'FaTableCellsLarge'],
  ['projects', 'FaDiagramProject'],
  ['reports', 'FaChartColumn'],
  ['survey', 'FaClipboardList'],
  ['trash', 'FaTrashCan'],
  ['users', 'FaUser'],
  ['roles', 'FaShieldHalved'],
  ['departments', 'FaBuilding'],
  ['permissions', 'FaKey'],
  ['modules', 'FaLayerGroup'],
  ['activity_logs', 'FaWaveSquare'],
]

export const permissions: Array<readonly [string, string]> = [
  ['เข้าถึงเมนูแดชบอร์ด', 'dashboard'],
  ['เข้าถึงเมนูโครงการ', 'projects'],
  ['สร้างโครงการ', 'projects'],
  ['แก้ไขโครงการ', 'projects'],
  ['ลบโครงการ', 'projects'],
  ['เข้าถึงเมนูถังขยะ', 'trash'],
  ['กู้คืนโครงการ', 'trash'],
  ['เข้าถึงเมนูรายงาน', 'reports'],
  ['เข้าถึงเมนูแบบสำรวจ', 'survey'],
  ['เข้าถึงเมนูผู้ใช้งาน', 'users'],
  ['สร้างผู้ใช้งาน', 'users'],
  ['แก้ไขผู้ใช้งาน', 'users'],
  ['ลบผู้ใช้งาน', 'users'],
  ['เข้าถึงเมนูบทบาทและสิทธิ์', 'roles'],
  ['เพิ่มบทบาท', 'roles'],
  ['แก้ไขบทบาทและสิทธิ์', 'roles'],
  ['ลบบทบาท', 'roles'],
  ['เข้าถึงเมนูแผนก', 'departments'],
  ['เพิ่มแผนก', 'departments'],
  ['แก้ไขแผนก', 'departments'],
  ['ลบแผนก', 'departments'],
  ['เข้าถึงเมนูสิทธิ์', 'permissions'],
  ['เพิ่มสิทธิ์', 'permissions'],
  ['แก้ไขสิทธิ์', 'permissions'],
  ['ลบสิทธิ์', 'permissions'],
  ['เข้าถึงเมนูโมดูล', 'modules'],
  ['เพิ่มโมดูล', 'modules'],
  ['แก้ไขโมดูล', 'modules'],
  ['ลบโมดูล', 'modules'],
  ['เข้าถึงเมนูบันทึกกิจกรรม', 'activity_logs'],
]

export const rolePermissions: Record<string, readonly string[]> = {
  admin: permissions.map(([name]) => name),
  manager: [
    'เข้าถึงเมนูแดชบอร์ด', 'เข้าถึงเมนูโครงการ', 'สร้างโครงการ', 'แก้ไขโครงการ',
    'ลบโครงการ', 'เข้าถึงเมนูถังขยะ', 'กู้คืนโครงการ', 'เข้าถึงเมนูรายงาน', 'เข้าถึงเมนูแบบสำรวจ', 'เข้าถึงเมนูบันทึกกิจกรรม',
  ],
  user: ['เข้าถึงเมนูแดชบอร์ด', 'เข้าถึงเมนูโครงการ', 'สร้างโครงการ', 'แก้ไขโครงการ'],
  viewer: ['เข้าถึงเมนูแดชบอร์ด', 'เข้าถึงเมนูโครงการ'],
}
