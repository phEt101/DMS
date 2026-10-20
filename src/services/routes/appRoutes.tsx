import DashboardPage from '../../features/dashboard/page'
import ProjectsPage from '../../features/projects/page'
import CmProjectsPage from '../../features/projects/projects-cm/page'
import CmCreatePage from '../../features/projects/projects-cm/create'
import SurveyPage from '../../features/projects/survey/page'
import ReportPage from '../../features/doc/report/page'
import SettingsAccessPage from '../../features/settings/access/page'
import SettingsUsersPage from '../../features/settings/users/page'
import SettingsActivityPage from '../../features/settings/activity/page'
import type { Language, Translations } from '../../locales'
import DocumentPage from '../../features/doc/page'
import type { PageKey } from './pageTypes'

export function buildPages(translations: Translations, language: Language, onNavigate?: (page: PageKey) => void) {
  return {
    dashboard: <DashboardPage translations={translations} onNavigate={onNavigate} />,
    projects: <ProjectsPage translations={translations} language={language} />,
    'projects-cm': <CmProjectsPage translations={translations} language={language} />,
    'projects-cm-create': <CmCreatePage translations={translations} language={language} />,
    survey: <SurveyPage translations={translations} language={language} />,
    report: <ReportPage translations={translations} language={language} />,
    'settings-user': <SettingsUsersPage translations={translations} />,
    'settings-roles': <SettingsAccessPage translations={translations} section="roles" />,
    'settings-departments': <SettingsAccessPage translations={translations} section="departments" />,
    'settings-permissions': <SettingsAccessPage translations={translations} section="permissions" />,
    'settings-modules': <SettingsAccessPage translations={translations} section="modules" />,
    'settings-companies': <SettingsAccessPage translations={translations} section="companies" />,
    'settings-activity': <SettingsActivityPage translations={translations} language={language} />,
    documents: <DocumentPage translations={translations} view="all" />,
    'documents-all': <DocumentPage translations={translations} view="all" />,
    'documents-pending': <DocumentPage translations={translations} view="pending" />,
    'documents-ledger': <DocumentPage translations={translations} view="ledger" />,
    'documents-employees': <DocumentPage translations={translations} view="employees" />,
    'documents-policy': <DocumentPage translations={translations} view="policy" />,
    'documents-notifications': <DocumentPage translations={translations} view="notifications" />
  }
}
