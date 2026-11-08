import { useCallback, useState } from 'react'
import type { Language, Translations } from '../../../locales'
import { translateServerErrorMessage } from '../../../services/api'
import { useAuth } from '../../auth/hooks/use-auth'
import { hasPermission } from '../../auth/permissions'
import ManagePayslips from './components/manage-payslips'
import MyPayslips from './components/my-payslips'
import './payslips.css'

type Tab = 'mine' | 'manage'

export default function PayslipsPage({ translations, language }: { translations: Translations; language: Language }) {
  const copy = (translations.features as any).payslips as Record<string, string>
  const { user } = useAuth()
  const locale = language === 'th' ? 'th-TH' : 'en-US'
  const canManage = Boolean(user && (
    user.role.name.trim().toLowerCase() === 'admin'
    || (String(user.department ?? '').trim().toLowerCase() === 'hr div.' && hasPermission(user, 'จัดการสลิปเงินเดือน'))
  ))
  const [tab, setTab] = useState<Tab>('mine')

  const periodLabel = useCallback(
    (year: number, month: number) => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1)),
    [locale],
  )
  const errorText = (error: unknown) => translateServerErrorMessage(error, language) || copy.loadError
  const sharedProps = { copy, locale, periodLabel, errorText }

  return (
    <section className="feature-page feature-page--wide documents-page payslips-page">
      <p className="feature-kicker">{translations.sidebar.items.documents}</p>
      <div className="documents-heading">
        <div>
          <h1>{copy.title}</h1>
          <span>{copy.subtitle}</span>
        </div>
      </div>

      {canManage && (
        <div className="documents-notification-tabs payslips-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'mine'} aria-pressed={tab === 'mine'} onClick={() => setTab('mine')}>{copy.tabMine}</button>
          <button type="button" role="tab" aria-selected={tab === 'manage'} aria-pressed={tab === 'manage'} onClick={() => setTab('manage')}>{copy.tabManage}</button>
        </div>
      )}

      {tab === 'mine' || !canManage
        ? <MyPayslips {...sharedProps} />
        : <ManagePayslips {...sharedProps} />}
    </section>
  )
}
