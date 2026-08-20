import type { ReactNode } from 'react'
import { getLocale } from '../locales'

function TopbarIcon({ children }: { children: ReactNode }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
}

export default function Topbar({ language = 'th', onLanguageToggle, onMenuClick }: {
  language?: 'th' | 'en'
  onLanguageToggle?: () => void
  onMenuClick?: () => void
}) {
  const isThai = language === 'th'
  const t = getLocale(language).topbar

  return <header className="topbar">
    <div className="topbar-left">
      <button className="icon-button menu-button" onClick={onMenuClick} aria-label={t.openNav}><TopbarIcon><path d="M4 7h16M4 12h16M4 17h16" /></TopbarIcon></button>
    </div>
    <div className="topbar-actions">
      <button className="icon-button notification-button" aria-label={t.notifications}><TopbarIcon><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></TopbarIcon><span /></button>
      <button className="language-switch" onClick={onLanguageToggle} aria-label={isThai ? t.switchToEnglish : t.switchToThai}>
        <span className={`language-chip ${isThai ? 'is-active' : ''}`}>TH</span>
        <span className={`language-chip ${!isThai ? 'is-active' : ''}`}>EN</span>
      </button>
      <div className="profile-divider" />
      <button className="profile-button"><span className="avatar">SN</span><span className="profile-copy"><strong>Sarah Jenkins</strong><small>{t.profileRole}</small></span><span className="profile-chevron">⌄</span></button>
    </div>
  </header>
}
