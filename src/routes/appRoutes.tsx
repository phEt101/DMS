import DashboardPage from '../features/dashboard/page'
import DocumentsPage from '../features/documents/page'
import ReportPage from '../features/report/page'
import TrashPage from '../features/trash/page'
import SettingsAccessPage from '../features/settings/access/page'
import SettingsUsersPage from '../features/settings/users/page'
import SettingsActivityPage from '../features/settings/activity/page'
import type { Language } from '../locales'

export function buildPages(features: any, language: Language) {
  return {
    dashboard: <DashboardPage t={features.dashboard} />,
    documents: <DocumentsPage t={features.documents} />,
    report: <ReportPage t={features.report} />,
    trash: <TrashPage t={features.trash} />,
    'settings-user': <SettingsUsersPage t={features.settingsUser} />,
    'settings-roles': <SettingsAccessPage t={features.settingsUser} section="roles" />,
    'settings-departments': <SettingsAccessPage t={features.settingsUser} section="departments" />,
    'settings-permissions': <SettingsAccessPage t={features.settingsUser} section="permissions" />,
    'settings-modules': <SettingsAccessPage t={features.settingsUser} section="modules" />,
    'settings-activity': <SettingsActivityPage t={features.settingsActivity} language={language} />,
  }
}
