import DashboardPage from '../features/dashboard/page'
import DocumentsPage from '../features/documents/page'
import ReportPage from '../features/report/page'
import TrashPage from '../features/trash/page'
import SettingsUserPage from '../features/settings/user/page'
import SettingsActivityPage from '../features/settings/activity/page'

export function buildPages(features: any) {
  return {
    dashboard: <DashboardPage t={features.dashboard} />,
    documents: <DocumentsPage t={features.documents} />,
    report: <ReportPage t={features.report} />,
    trash: <TrashPage t={features.trash} />,
    'settings-user': <SettingsUserPage t={features.settingsUser} />,
    'settings-activity': <SettingsActivityPage t={features.settingsActivity} />,
  }
}
