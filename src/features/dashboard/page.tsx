import { useState, useEffect } from 'react'
import { FaCalendarCheck, FaClock, FaFileLines } from 'react-icons/fa6'
import type { Translations } from '../../locales'
import type { PageKey } from '../../services/routes/pageTypes'
import { getMySummary, type DashboardSummary } from './services/summary.service'
import './dashboard.css'

// 1 วันทำงาน = 8 ชั่วโมง (ปรับได้ตามนโยบายบริษัท)
const HOURS_PER_DAY = 8

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

// แปลงจำนวนวัน (ทศนิยมได้) -> { d: วันเต็ม, h: ชั่วโมงที่เหลือ }
const splitDays = (days: number) => {
  const totalHours = Math.round(Math.max(days, 0) * HOURS_PER_DAY * 10) / 10
  const d = Math.floor(totalHours / HOURS_PER_DAY)
  const h = Math.round((totalHours - d * HOURS_PER_DAY) * 10) / 10
  return { d, h }
}

// 0.63 -> "5 ชม." | 1.63 -> "1 วัน 5 ชม." | 2 -> "2 วัน" | 0 -> "0 วัน"
const formatDuration = (days: number, t: DashboardBalances) => {
  const { d, h } = splitDays(days)
  if (!d && !h) return t.zero
  return [d ? `${d} ${t.dayShort}` : '', h ? `${fmt(h)} ${t.hourShort}` : ''].filter(Boolean).join(' ')
}

type DashboardBalances = DashboardTranslations['balances']
type DashboardTranslations = NonNullable<Translations['features']['dashboard']>

function BigDuration({ days, total, t }: { days: number; total: number; t: DashboardBalances }) {
  const { d, h } = splitDays(days)
  const showDays = d > 0 || h === 0
  return <div className="dashboard-balance-number">
    {showDays && <span className="dashboard-balance-unit-group"><strong>{d}</strong>{(h > 0) && <span>{t.day}</span>}</span>}
    {h > 0 && <span className="dashboard-balance-unit-group"><strong>{fmt(h)}</strong><span>{t.hourShort}</span></span>}
    <span className="dashboard-balance-total">/ {formatDuration(total, t)}</span>
  </div>
}

export default function DashboardPage({ translations: _translations, onNavigate }: { translations: Translations; onNavigate?: (page: PageKey) => void }) {
  const dashboardTranslations = _translations.features.dashboard
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  useEffect(() => {
    let cancelled = false
    getMySummary()
      .then((data) => { if (!cancelled) setSummary(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])
  const balances: Array<{ id: string; title: string; remaining: number; total: number; used: number; pending: number }> = summary?.balances ?? []
  const stats = summary?.stats ?? { total: 0, pending: 0, approved: 0 }
  const t = dashboardTranslations as DashboardTranslations
  const s = t.stats
  const b = t.balances
  // ชื่อสิทธิ์จาก server เป็นภาษาไทย hardcode — แปลใหม่ที่ฝั่ง frontend ตาม bucket id
  const balanceTitle = (id: string, fallback: string) => (b.names as Record<string, string | undefined>)[id] ?? fallback

  return <div className="dms-page-root dashboard-page-root">
    <section className="dms-col-main dashboard-page">
      <p className="dms-kicker">{t.kicker}</p>
      <div className="dms-title-row dashboard-title-row">
        <div className="dms-title-block"><h1>{t.title}</h1><div className="dms-subtitle">{t.subtitle}</div></div>
      </div>

      <div className="dms-card-grid dms-survey-grid dashboard-stats">
        <article className="dms-project-card"><span className="dashboard-stat-icon is-blue"><FaFileLines /></span><div><small>{s.myDocuments}</small><strong>{stats.total}</strong><span>{s.myDocumentsHint}</span></div></article>
        <article className="dms-project-card"><span className="dashboard-stat-icon is-amber"><FaClock /></span><div><small>{s.pending}</small><strong>{stats.pending}</strong><span>{s.pendingHint}</span></div></article>
        <article className="dms-project-card"><span className="dashboard-stat-icon is-green"><FaCalendarCheck /></span><div><small>{s.approved}</small><strong>{stats.approved}</strong><span>{s.approvedHint}</span></div></article>
      </div>

      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div><h2>{b.heading}</h2><p>{b.subheading.replace('{{hours}}', String(HOURS_PER_DAY))}</p></div>
        </div>
        <div className="dms-card-grid dms-survey-grid dashboard-balances">{balances.map((balance) => {
          const { total, remaining, used, pending } = balance
          const usedWidth = total ? Math.min(used / total * 100, 100) : 0
          const pendingWidth = total ? Math.min(pending / total * 100, 100 - usedWidth) : 0
          const percentLeft = total ? Math.round(remaining / total * 100) : 0
          const tier = !total ? 'is-none' : percentLeft <= 20 ? 'is-low' : percentLeft <= 50 ? 'is-mid' : 'is-good'
          return <article className={`dms-project-card dashboard-balance-card ${tier}`} key={balance.id}>
            <div className="dashboard-balance-head">
              <h3>{balanceTitle(balance.id, balance.title)}</h3>
              <span className="dashboard-balance-chip">{b.chipLeft.replace('{{percent}}', String(percentLeft))}</span>
            </div>

            <div className="dashboard-balance-main">
              <small className="dashboard-balance-label">{b.labelRemaining}</small>
              <BigDuration days={remaining} total={total} t={b} />
            </div>

            <div
              className="dashboard-balance-bar"
              role="img"
              aria-label={b.ariaBar
                .replace('{{used}}', formatDuration(used, b))
                .replace('{{pending}}', formatDuration(pending, b))
                .replace('{{remaining}}', formatDuration(remaining, b))}
            >
              <i className="is-used" style={{ width: `${usedWidth}%` }} />
              <i className="is-pending" style={{ width: `${pendingWidth}%` }} />
            </div>

            <dl className="dashboard-balance-legend">
              <div><dt><i className="dot is-used" />{b.legendUsed}</dt><dd>{formatDuration(used, b)}</dd></div>
              <div><dt><i className="dot is-pending" />{b.legendPending}</dt><dd>{formatDuration(pending, b)}</dd></div>
              <div><dt><i className="dot is-left" />{b.legendRemaining}</dt><dd>{formatDuration(remaining, b)}</dd></div>
            </dl>
          </article>
        })}</div>
      </section>
    </section>
  </div>
}