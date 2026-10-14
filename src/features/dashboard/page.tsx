import { useState } from 'react'
import { FaCalendarCheck, FaClock, FaFileLines } from 'react-icons/fa6'
import type { Translations } from '../../locales'
import type { PageKey } from '../../services/routes/pageTypes'
import './dashboard.css'

const balancesByYear = {
  2569: [
    { id:'sick', title:'ลาป่วยคงเหลือ', remaining:28, total:30, used:2, pending:0 },
    { id:'personal', title:'ลากิจคงเหลือ', remaining:1, total:3, used:2, pending:3 },
    { id:'vacation', title:'ลาพักร้อนคงเหลือ', remaining:3, total:6, used:3, pending:3 },
  ],
  2568: [
    { id:'sick', title:'ลาป่วยคงเหลือ', remaining:26, total:30, used:4, pending:0 },
    { id:'personal', title:'ลากิจคงเหลือ', remaining:2, total:3, used:1, pending:0 },
    { id:'vacation', title:'ลาพักร้อนคงเหลือ', remaining:1, total:6, used:5, pending:0 },
  ],
  2567: [
    { id:'sick', title:'ลาป่วยคงเหลือ', remaining:29, total:30, used:1, pending:0 },
    { id:'personal', title:'ลากิจคงเหลือ', remaining:0, total:3, used:3, pending:0 },
    { id:'vacation', title:'ลาพักร้อนคงเหลือ', remaining:4, total:6, used:2, pending:0 },
  ],
}

const recentDocuments = [
  { id:'LV-2569-0012', title:'ลากิจ · 1 วัน', detail:'30 ต.ค. 2569 · ธุระส่วนตัว', status:'รอ HR ตรวจ', kind:'pending' },
  { id:'LV-2569-0011', title:'ลาพักร้อน · 3 วัน', detail:'18–20 พ.ย. 2569 · พักผ่อนปลายปี', status:'รอผู้จัดการ', kind:'pending' },
  { id:'LV-2569-0009', title:'ลาพักร้อน · 3 วัน', detail:'15–17 มิ.ย. 2569 · เดินทางกับครอบครัว', status:'อนุมัติแล้ว', kind:'approved' },
]

export default function DashboardPage({ translations: _translations, onNavigate }: { translations: Translations; onNavigate?: (page: PageKey) => void }) {
  const dashboardTranslations = _translations.features.dashboard
  const [selectedYear, setSelectedYear] = useState<keyof typeof balancesByYear>(2569)
  const balances = balancesByYear[selectedYear]

  return <section className="feature-page feature-page--wide dashboard-page">
    <div className="dashboard-heading">
      <div><p className="feature-kicker">{dashboardTranslations.kicker}</p><h1>{dashboardTranslations.title}</h1><p>{dashboardTranslations.subtitle}</p></div>
    </div>

    <div className="dashboard-stats">
      <article><span className="dashboard-stat-icon is-blue"><FaFileLines /></span><div><small>เอกสารของฉัน</small><strong>8</strong><span>รายการทั้งหมด</span></div></article>
      <article><span className="dashboard-stat-icon is-amber"><FaClock /></span><div><small>รอพิจารณา</small><strong>3</strong><span>รายการกำลังดำเนินการ</span></div></article>
      <article><span className="dashboard-stat-icon is-green"><FaCalendarCheck /></span><div><small>อนุมัติแล้ว</small><strong>5</strong><span>รายการในปีนี้</span></div></article>
    </div>

    <section className="dashboard-section">
      <div className="dashboard-section-heading"><div><h2>สิทธิ์วันลาคงเหลือ</h2><p>สรุปสิทธิ์วันลาตัวอย่าง ประจำปี {selectedYear}</p></div><label className="dashboard-year-select"><span>ปี</span><select aria-label="เลือกปีสำหรับสิทธิ์วันลา" value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value) as keyof typeof balancesByYear)}>{Object.keys(balancesByYear).sort((a, b) => Number(b) - Number(a)).map((year) => <option key={year} value={year}>{year}</option>)}</select></label></div>
      <div className="dashboard-balances">{balances.map((balance) => {
        const progressTotal = balance.used + balance.pending
        const usedWidth = progressTotal ? balance.used / progressTotal * 100 : 0
        const pendingWidth = progressTotal ? balance.pending / progressTotal * 100 : 0
        return <article className="dashboard-balance-card" key={balance.id}>
          <h3>{balance.title}</h3>
          <div className="dashboard-balance-number"><strong>{balance.remaining}</strong><span>/ {balance.total} วัน</span></div>
          <div className="dashboard-balance-bar" role="img" aria-label={`ใช้แล้ว ${balance.used} วัน รออนุมัติ ${balance.pending} วัน`}><i className="is-used" style={{ width:`${usedWidth}%` }} /><i className="is-pending" style={{ width:`${pendingWidth}%` }} /></div>
          <p>ใช้แล้ว {balance.used}{balance.pending ? ` · รออนุมัติ ${balance.pending}` : ''} วัน</p>
        </article>
      })}</div>
    </section>

    <section className="dashboard-section dashboard-recent-section">
      <div className="dashboard-section-heading"><div><h2>เอกสารล่าสุด</h2><p>รายการตัวอย่างที่อัปเดตล่าสุด</p></div><button type="button" onClick={() => onNavigate?.('documents-all')}>ดูเอกสารทั้งหมด</button></div>
      <div className="dashboard-recent-list">{recentDocuments.map((doc) => <button type="button" key={doc.id} className="dashboard-recent-item" onClick={() => onNavigate?.('documents-all')}><span className="dashboard-recent-icon"><FaFileLines /></span><span className="dashboard-recent-copy"><strong>{doc.title}</strong><small>{doc.detail} · {doc.id}</small></span><span className={`dashboard-status is-${doc.kind}`}>{doc.status}</span></button>)}</div>
    </section>
  </section>
}
