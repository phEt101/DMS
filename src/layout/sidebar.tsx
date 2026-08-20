import { useState } from 'react'
import { getLocale } from '../locales'

const icons = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  documents: <><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></>,
  report: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  trash: <><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 3.5-6 8-6s7.2 2 8 6"/></>,
  activity: <path d="M3 12h4l2-6 4 12 2-6h6"/>,
}

function Icon({ name }: { name: keyof typeof icons }) {
  return <svg className="nav-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>
}

type SidebarItem = 'dashboard' | 'documents' | 'report' | 'trash' | 'settings-user' | 'settings-activity'

export default function Sidebar({ language = 'th', collapsed = false, mobileOpen = false, onClose, onToggle, activeItem = 'documents', onNavigate }: {
  language?: 'th' | 'en'
  collapsed?: boolean
  mobileOpen?: boolean
  onClose?: () => void
  onToggle?: () => void
  activeItem?: SidebarItem
  onNavigate?: (item: SidebarItem) => void
}) {
  const [settingsOpen, setSettingsOpen] = useState(true)
  const t = getLocale(language).sidebar
  const mainItems: Array<{ key: SidebarItem; icon: keyof typeof icons; label: string }> = [
    { key: 'dashboard', icon: 'dashboard', label: t.items.dashboard },
    { key: 'documents', icon: 'documents', label: t.items.documents },
    { key: 'report', icon: 'report', label: t.items.report },
    { key: 'trash', icon: 'trash', label: t.items.trash },
  ]

  return <>
    <button className={`sidebar-backdrop ${mobileOpen ? 'is-visible' : ''}`} onClick={onClose} aria-label={t.closeNav} />
    <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}>
      <div className="brand-row">
        <span className="brand-mark"><span /></span>
        <div className="brand-copy"><strong>Bocwell</strong><small>{t.brand}</small></div>
        <button className="sidebar-toggle" onClick={onToggle} aria-label={collapsed ? t.expand : t.collapse}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={collapsed ? 'm9 18 6-6-6-6' : 'm15 18-6-6 6-6'} />
          </svg>
        </button>
        <button className="mobile-close" onClick={onClose} aria-label={t.close}>×</button>
      </div>
      <nav className="sidebar-nav" aria-label={t.navigation}>
        {mainItems.map((item) => {
          return (
            <button className={`nav-item nav-button ${activeItem === item.key ? 'is-active' : ''}`} key={item.key} title={collapsed ? item.label : undefined} onClick={() => onNavigate?.(item.key)}>
              <Icon name={item.icon} /><span>{item.label}</span>{item.key === 'documents' && <b className="item-count">11</b>}
            </button>
          )
        })}
        <div className="nav-divider" />
        <div className="settings-group">
          <button className="nav-item nav-button settings-toggle" onClick={() => setSettingsOpen((open) => !open)} title={collapsed ? t.settingsHint : undefined} aria-expanded={settingsOpen}>
            <Icon name="settings" /><span>{t.settings}</span><i className={settingsOpen ? 'is-rotated' : ''}>⌄</i>
          </button>
          {settingsOpen && <div className="subnav">
            <strong className="subnav-title">{t.settings}</strong>
            <button className="nav-item nav-button" onClick={() => onNavigate?.('settings-user')}><Icon name="user" /><span>{t.user}</span></button>
            <button className="nav-item nav-button" onClick={() => onNavigate?.('settings-activity')}><Icon name="activity" /><span>{t.activity}</span></button>
          </div>}
        </div>
      </nav>
    </aside>
  </>
}
