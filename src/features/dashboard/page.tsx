import { useState, useEffect } from 'react'
import { FaCalendarCheck, FaClock, FaFileLines } from 'react-icons/fa6'
import type { Translations } from '../../locales'
import type { PageKey } from '../../services/routes/pageTypes'
import { getMySummary, type DashboardSummary } from './services/summary.service'
import './dashboard.css'

export default function DashboardPage({ translations: _translations, onNavigate }: { translations: Translations; onNavigate?: (page: PageKey) => void }) {
  const dashboardTranslations = _translations.features.dashboard
  // ข้อมูลจริงจาก /employee-requests/summary (ตามผู้ใช้ที่ล็อกอิน) — ถ้าโหลดไม่ได้ใช้ค่าว่าง
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
  return <div className="dms-page-root dashboard-page-root">
    <section className="dms-col-main dashboard-page">
      <p className="dms-kicker">{dashboardTranslations.kicker}</p>
      <div className="dms-title-row dashboard-title-row">
        <div className="dms-title-block"><h1>{dashboardTranslations.title}</h1><div className="dms-subtitle">{dashboardTranslations.subtitle}</div></div>
      </div>

    <div className="dms-card-grid dms-survey-grid dashboard-stats">
      <article className="dms-project-card"><span className="dashboard-stat-icon is-blue"><FaFileLines /></span><div><small>เอกสารของฉัน</small><strong>{stats.total}</strong><span>รายการทั้งหมด</span></div></article>
      <article className="dms-project-card"><span className="dashboard-stat-icon is-amber"><FaClock /></span><div><small>รอพิจารณา</small><strong>{stats.pending}</strong><span>รายการกำลังดำเนินการ</span></div></article>
      <article className="dms-project-card"><span className="dashboard-stat-icon is-green"><FaCalendarCheck /></span><div><small>อนุมัติแล้ว</small><strong>{stats.approved}</strong><span>รายการทั้งหมด</span></div></article>
    </div>

    <section className="dashboard-section">
      <div className="dashboard-section-heading"><div><h2>สิทธิ์วันลาคงเหลือ</h2><p>สรุปสิทธิ์วันลาของคุณจากระบบเอกสาร</p></div></div>
      <div className="dms-card-grid dms-survey-grid dashboard-balances">{balances.map((balance) => {
        const progressTotal = balance.used + balance.pending
        const usedWidth = progressTotal ? balance.used / progressTotal * 100 : 0
        const pendingWidth = progressTotal ? balance.pending / progressTotal * 100 : 0
        return <article className="dms-project-card dashboard-balance-card" key={balance.id}>
          <h3>{balance.title}</h3>
          <div className="dashboard-balance-number"><strong>{balance.remaining}</strong><span>/ {balance.total} วัน</span></div>
          <div className="dashboard-balance-bar" role="img" aria-label={`ใช้แล้ว ${balance.used} วัน รออนุมัติ ${balance.pending} วัน`}><i className="is-used" style={{ width:`${usedWidth}%` }} /><i className="is-pending" style={{ width:`${pendingWidth}%` }} /></div>
          <p>ใช้แล้ว {balance.used}{balance.pending ? ` · รออนุมัติ ${balance.pending}` : ''} วัน</p>
        </article>
      })}</div>
    </section>

    {/* <section className="dashboard-section dashboard-recent-section">
      <div className="dashboard-section-heading"><div><h2>เอกสารล่าสุด</h2><p>รายการตัวอย่างที่อัปเดตล่าสุด</p></div><button type="button" onClick={() => onNavigate?.('documents-all')}>ดูเอกสารทั้งหมด</button></div>
      <div className="dashboard-recent-list">{recentDocuments.map((doc) => <button type="button" key={doc.id} className="dashboard-recent-item" onClick={() => onNavigate?.('documents-all')}><span className="dashboard-recent-icon"><FaFileLines /></span><span className="dashboard-recent-copy"><strong>{doc.title}</strong><small>{doc.detail} · {doc.id}</small></span><span className={`dashboard-status is-${doc.kind}`}>{doc.status}</span></button>)}</div>
    </section> */}
    </section>
  </div>
}
