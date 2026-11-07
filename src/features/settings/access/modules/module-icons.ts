import {
  FaBell,
  FaBook,
  FaBuilding,
  FaChartColumn,
  FaClipboardList,
  FaClock,
  FaDiagramProject,
  FaFolderOpen,
  FaKey,
  FaLayerGroup,
  FaMoneyCheckDollar,
  FaRoute,
  FaShieldHalved,
  FaSliders,
  FaTableCellsLarge,
  FaUser,
  FaUsers,
  FaWaveSquare,
} from 'react-icons/fa6'
import type { IconType } from 'react-icons'

export const moduleIconComponents: Record<string, IconType> = {
  FaBell,
  FaBook,
  FaBuilding,
  FaChartColumn,
  FaClipboardList,
  FaClock,
  FaDiagramProject,
  FaFolderOpen,
  FaKey,
  FaLayerGroup,
  FaMoneyCheckDollar,
  FaRoute,
  FaShieldHalved,
  FaSliders,
  FaTableCellsLarge,
  FaUser,
  FaUsers,
  FaWaveSquare,
}

export const moduleIconOptions = Object.entries(moduleIconComponents).map(([name, Icon]) => ({ name, Icon }))

export const defaultModuleIconNames: Record<string, string> = {
  dashboard: 'FaTableCellsLarge',
  projects: 'FaDiagramProject',
  projects_cm: 'FaDiagramProject',
  survey: 'FaClipboardList',
  documents: 'FaFolderOpen',
  documents_pending: 'FaClock',
  documents_ledger: 'FaBook',
  report: 'FaChartColumn',
  documents_employees: 'FaUsers',
  documents_policy: 'FaSliders',
  documents_flow_rules: 'FaRoute',
  documents_notifications: 'FaBell',
  documents_payslips: 'FaMoneyCheckDollar',
  users: 'FaUser',
  roles: 'FaShieldHalved',
  departments: 'FaBuilding',
  permissions: 'FaKey',
  modules: 'FaLayerGroup',
  companies: 'FaBuilding',
  activity_logs: 'FaWaveSquare',
}

export function getModuleIcon(iconName: string | null | undefined): IconType {
  return iconName ? moduleIconComponents[iconName] ?? FaLayerGroup : FaLayerGroup
}
