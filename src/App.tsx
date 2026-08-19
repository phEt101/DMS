import { useState } from 'react'
import Sidebar from './layout/sidebar'
import Topbar from './layout/topbar'
import { getLocale } from './locales'
import { buildPages } from './routes/appRoutes'

export default function App() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [language, setLanguage] = useState<'th' | 'en'>('th')
  const [activeItem, setActiveItem] = useState<'dashboard' | 'documents' | 'report' | 'trash' | 'settings-user' | 'settings-activity'>('documents')
  const copy = getLocale(language).app
  const features = getLocale(language).features
  const pages = buildPages(features)
  const handleNavigate = (item: typeof activeItem) => {
    if (pages[item]) setActiveItem(item)
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
