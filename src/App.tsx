import { useEffect, useState } from 'react'
import Sidebar from './layout/sidebar'
import Topbar from './layout/topbar'
import { getLocale } from './locales'
import { buildPages } from './routes/appRoutes'

type PageKey = 'dashboard' | 'documents' | 'report' | 'trash' | 'settings-user' | 'settings-activity'

const pathByPage: Record<PageKey, string> = {
  dashboard: '/dashboard',
  documents: '/documents',
  report: '/reports',
  trash: '/trash',
  'settings-user': '/settings/users',
  'settings-activity': '/settings/activity',
}

function pageFromPath(pathname: string): PageKey {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return (Object.entries(pathByPage).find(([, path]) => path === normalized)?.[0] as PageKey | undefined) ?? 'dashboard'
}

export default function App() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [language, setLanguage] = useState<'th' | 'en'>('th')
  const [activeItem, setActiveItem] = useState<PageKey>(() => pageFromPath(window.location.pathname))
  const copy = getLocale(language).app
  const features = getLocale(language).features
  const pages = buildPages(features)
  useEffect(() => {
    const syncFromUrl = () => setActiveItem(pageFromPath(window.location.pathname))
    window.addEventListener('popstate', syncFromUrl)
    const canonicalPath = pathByPage[pageFromPath(window.location.pathname)]
    if (window.location.pathname !== canonicalPath) window.history.replaceState({}, '', canonicalPath)
    return () => window.removeEventListener('popstate', syncFromUrl)
  }, [])

  const handleNavigate = (item: PageKey) => {
    if (pages[item]) {
      setActiveItem(item)
      if (window.location.pathname !== pathByPage[item]) window.history.pushState({}, '', pathByPage[item])
    }
    setMobileOpen(false)
  }

  return <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <Sidebar language={language} collapsed={collapsed} mobileOpen={mobileOpen} activeItem={activeItem} onNavigate={handleNavigate} onClose={() => setMobileOpen(false)} onToggle={() => setCollapsed((value) => !value)} />
    <div className="app-main">
      <Topbar language={language} onLanguageToggle={() => setLanguage((value) => (value === 'th' ? 'en' : 'th'))} onMenuClick={() => setMobileOpen(true)} />
      <main className="page-placeholder">{pages[activeItem] ?? <section className="feature-page"><p className="feature-kicker">{copy.section}</p><h1>{copy.title}</h1><span>{copy.subtitle}</span></section>}</main>
    </div>
  </div>
}
