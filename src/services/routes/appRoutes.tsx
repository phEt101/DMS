import DashboardPage from '../../features/dashboard/page'
import ProjectsPage from '../../features/projects/page'
import CmProjectsPage from '../../features/projects/projects-cm/page'
import CmCreatePage from '../../features/projects/projects-cm/create'
import SurveyPage from '../../features/projects/survey/page'
import ReportPage from '../../features/report/page'
import TrashPage from '../../features/trash/page'
import SettingsAccessPage from '../../features/settings/access/page'
import SettingsUsersPage from '../../features/settings/users/page'
import SettingsActivityPage from '../../features/settings/activity/page'
import type { Language, Translations } from '../../locales'

export function buildPages(translations: Translations, language: Language) {
  return {
    dashboard: <DashboardPage translations={translations} />,
    projects: <ProjectsPage translations={translations} language={language} />,
    'projects-cm': <CmProjectsPage translations={translations} language={language} />,
    'projects-cm-create': <CmCreatePage translations={translations} language={language} />,
    survey: <SurveyPage translations={translations} language={language} />,
    report: <ReportPage translations={translations} />,
    trash: <TrashPage translations={translations} />,
    'settings-user': <SettingsUsersPage translations={translations} />,
    'settings-roles': <SettingsAccessPage translations={translations} section="roles" />,
    'settings-departments': <SettingsAccessPage translations={translations} section="departments" />,
    'settings-permissions': <SettingsAccessPage translations={translations} section="permissions" />,
    'settings-modules': <SettingsAccessPage translations={translations} section="modules" />,
    'settings-activity': <SettingsActivityPage translations={translations} language={language} />,
  }
}
