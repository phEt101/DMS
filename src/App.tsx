import { useEffect, useState } from 'react'
import LoginPage from './features/auth/page'
import { useAuth } from './features/auth/hooks/use-auth'
import Sidebar from './layout/sidebar'
import Topbar from './layout/topbar'
import { getLocale } from './locales'
import { buildPages } from './routes/appRoutes'
import type { AuthUser } from './features/auth/types/auth.types'
import { canViewModule } from './features/auth/permissions'

type PageKey = 'dashboard' | 'documents' | 'report' | 'trash' | 'settings-user' | 'settings-roles' | 'settings-departments' | 'settings-permissions' | 'settings-modules' | 'settings-activity'

const pathByPage: Record<PageKey, string> = {
  dashboard: '/dashboard',
  documents: '/documents',
  report: '/reports',
  trash: '/trash',
  'settings-user': '/settings/users',
  'settings-roles': '/settings/access/roles',
  'settings-departments': '/settings/access/departments',
  'settings-permissions': '/settings/access/permissions',
  'settings-modules': '/settings/access/modules',
  'settings-activity': '/settings/activity',
}

const moduleByPage: Record<PageKey, string> = {
  dashboard: 'dashboard',
  documents: 'documents',
  report: 'reports',
  trash: 'trash',
  'settings-user': 'users',
  'settings-roles': 'roles',
  'settings-departments': 'departments',
  'settings-permissions': 'permissions',
  'settings-modules': 'modules',
  'settings-activity': 'activity_logs',
}

const pageOrder = Object.keys(pathByPage) as PageKey[]

function canAccessPage(user: AuthUser, page: PageKey) {
  return canViewModule(user, moduleByPage[page])
}

function firstAccessiblePage(user: AuthUser): PageKey | null {
  return pageOrder.find((page) => canAccessPage(user, page)) ?? null
}

function pageFromPath(pathname: string): PageKey {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (/^\/documents\/\d+$/.test(normalized)) return 'documents'
  return (Object.entries(pathByPage).find(([, path]) => path === normalized)?.[0] as PageKey | undefined) ?? 'dashboard'
}

function pathMatchesPage(pathname: string, page: PageKey) {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return normalized === pathByPage[page] || (page === 'documents' && /^\/documents\/\d+$/.test(normalized))
}

export default function App() {
  const { user, isLoading, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [language, setLanguage] = useState<'th' | 'en'>('th')
  const [activeItem, setActiveItem] = useState<PageKey>(() => pageFromPath(window.location.pathname))
  const translations = getLocale(language)
  const pages = buildPages(translations, language)
  useEffect(() => {
    if (isLoading) return
    if (!user) {
      setActiveItem('dashboard')
      if (window.location.pathname !== '/login') window.history.replaceState({}, '', '/login')
      return
    }

    const syncFromUrl = () => {
      const requestedPage = pageFromPath(window.location.pathname)
      const nextPage = canAccessPage(user, requestedPage)
        ? requestedPage
        : firstAccessiblePage(user)

      if (!nextPage) return
      setActiveItem(nextPage)
      if (!pathMatchesPage(window.location.pathname, nextPage)) {
        window.history.replaceState({}, '', pathByPage[nextPage])
      }
    }
    window.addEventListener('popstate', syncFromUrl)
    syncFromUrl()
    return () => window.removeEventListener('popstate', syncFromUrl)
  }, [isLoading, user])

  const handleNavigate = (item: PageKey) => {
    if (user && canAccessPage(user, item) && pages[item]) {
      setActiveItem(item)
      if (window.location.pathname !== pathByPage[item]) window.history.pushState({}, '', pathByPage[item])
    }
    setMobileOpen(false)
  }

  if (isLoading) {
    return <div className="auth-loading" role="status" aria-label="Loading"><span /></div>
  }

  if (!user) {
    return (
      <LoginPage
        translations={translations}
        language={language}
        onLanguageToggle={() => setLanguage((value) => (value === 'th' ? 'en' : 'th'))}
      />
    )
  }

  const canAccessActivePage = canAccessPage(user, activeItem)

  return <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <Sidebar translations={translations} collapsed={collapsed} mobileOpen={mobileOpen} activeItem={activeItem} onNavigate={handleNavigate} onClose={() => setMobileOpen(false)} onToggle={() => setCollapsed((value) => !value)} />
    <div className="app-main">
      <Topbar user={user} translations={translations} language={language} onLanguageToggle={() => setLanguage((value) => (value === 'th' ? 'en' : 'th'))} onMenuClick={() => setMobileOpen(true)} onLogout={logout} />
      <main className="page-placeholder">{canAccessActivePage
        ? pages[activeItem]
        : <section className="feature-page"><h1>ไม่มีสิทธิ์เข้าถึงหน้านี้</h1></section>}
      </main>
    </div>
  </div>
}
