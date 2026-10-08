import { useState } from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import type { Survey } from '../types'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const DefaultIcon = L.icon({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const VISIT_TYPE: Record<string, string> = {
  contact_new: 'ติดต่อเข้าพบใหม่',
  ref_doc: 'อ้างอิงเอกสารที่เคยขาย',
}
const FCP_STATUS: Record<string, string> = { on: 'เปิดใช้งาน', off: 'ปิดอยู่' }
const SURVEY_STATUS: Record<string, string> = { draft: 'แบบร่าง', submitted: 'ส่งแล้ว' }

const isEmpty = (v: unknown) =>
  v === undefined || v === null || v === '' || (typeof v === 'number' && Number.isNaN(v))

// สไตล์ของค่าที่แสดง (read-only) ให้หน้าตาคล้ายช่องกรอกในฟอร์ม
const valueBox: React.CSSProperties = {
  background: '#f6f7f9',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '10px 12px',
  minHeight: 20,
  fontSize: 14,
  lineHeight: 1.4,
  wordBreak: 'break-word',
}

/** ไม่มีข้อมูล = ไม่แสดงช่องนั้นเลย (ไม่มี "-") */
function Field({ label, value, full }: { label: string; value?: React.ReactNode; full?: boolean }) {
  if (isEmpty(value)) return null
  return (
    <div className={`dms-form-field${full ? ' dms-form-field--full' : ''}`}>
      <span className="dms-form-label">{label}</span>
      <div style={valueBox}>{value}</div>
    </div>
  )
}

function Badge({ yes }: { yes: boolean }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
      background: yes ? '#e6f4ea' : '#f1f3f4', color: yes ? '#1e7e34' : '#6b7280',
    }}>
      {yes ? 'มี' : 'ไม่มี'}
    </span>
  )
}

function PhotoTile({ src, caption, onOpen }: { src: string; caption: string; onOpen: (src: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(src)}
      style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 0, background: '#fff', cursor: 'zoom-in', overflow: 'hidden', textAlign: 'left' }}
    >
      <img src={src} alt={caption} style={{ display: 'block', width: '100%', height: 120, objectFit: 'cover' }} />
      {caption ? <div style={{ padding: '6px 10px', fontSize: 12, color: '#555' }}>{caption}</div> : null}
    </button>
  )
}

export default function SurveyDetail({ survey, onClose: _onClose, onEdit }: { survey: Survey; onClose: () => void; onEdit: (s: Survey) => void }) {
  const [preview, setPreview] = useState<string | null>(null)

  const equipment = (survey.equipment ?? []) as any[]
  const isYes = (e: any) => e.status === 'yes' || e.isPresent === true
  const haveCount = equipment.filter(isYes).length

  const photos: { src: string; caption: string }[] = []
  if (survey.signPhoto) photos.push({ src: survey.signPhoto, caption: 'ป้ายชื่ออาคาร' })
  if (survey.fcpOverview) photos.push({ src: survey.fcpOverview, caption: 'FCP ทั้งตู้' })
  if (survey.fcpNameplate) photos.push({ src: survey.fcpNameplate, caption: 'ป้ายชื่อ / แผงยี่ห้อ' })
  if (survey.fcpInside) photos.push({ src: survey.fcpInside, caption: 'ภายในตู้ / สายไฟ' })
  equipment.forEach((e) => { if (e.photo) photos.push({ src: e.photo as string, caption: e.name ?? '' }) })

  const loc = survey.location
  const hasCoord = !!loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number'

  const hasFcp = [survey.fcpBrand, survey.fcpModel, survey.fcpType, survey.fcpMaterial, survey.fcpStatus].some((v) => !isEmpty(v))
  const hasAddress = !!loc && [loc.address, loc.subdistrict, loc.district, loc.province, loc.postalCode, loc.country].some((v) => !isEmpty(v))

  return (
    <div>
      {/* Header */}
      <div className="dms-card-head" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>{survey.projectName || '(ไม่มีชื่อโครงการ)'}</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            {survey.surveyDate ? <small className="dms-card-date">วันที่สำรวจ {survey.surveyDate}</small> : null}
            {(() => {
              const statusKey = survey.status ?? ''
              return statusKey ? <span className={`dms-card-status is-${statusKey}`}>{String(SURVEY_STATUS[statusKey] ?? statusKey)}</span> : null
            })()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {survey.status === 'draft' && <button type="button" className="dms-create-btn" onClick={() => onEdit(survey)}>แก้ไข</button>}
          <RadixDialog.Close asChild>
            <button type="button" className="dms-back-btn">กลับ</button>
          </RadixDialog.Close>
        </div>
      </div>

      {/* ข้อมูลโครงการ */}
      <section className="dms-pm-create-section" style={{ marginTop: 12 }}>
        <h3>ข้อมูลโครงการ</h3>
        <Field label="ชื่อโครงการ / อาคาร" value={survey.projectName} full />
        <div className="dms-pm-create-grid">
          <Field label="จังหวัด" value={survey.province} />
          <Field label="จำนวนชั้น" value={survey.floors} />
        </div>
        <div className="dms-pm-create-grid">
          <Field label="ผู้ติดต่อ (ชื่อ)" value={survey.contact1?.name} />
          <Field
            label="ผู้ติดต่อ (โทรศัพท์)"
            value={survey.contact1?.phone ? <a href={`tel:${survey.contact1.phone}`} style={{ color: '#1a73e8', textDecoration: 'none' }}>{survey.contact1.phone}</a> : undefined}
          />
        </div>
        <div className="dms-pm-create-grid">
          <Field label="ตำแหน่ง" value={survey.contact1?.position} />
          <Field label="ประเภทการเยี่ยม" value={VISIT_TYPE[survey.visitType ?? ''] ?? survey.visitType} />
        </div>
      </section>

      {/* ตำแหน่งโครงการ */}
      {loc && (hasCoord || hasAddress) ? (
        <section className="dms-pm-create-section" style={{ marginTop: 12 }}>
          <h3>ตำแหน่งโครงการ</h3>
          {hasCoord ? (
            <div style={{ height: 280, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
              <MapContainer center={[loc.latitude as number, loc.longitude as number]} zoom={16} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[loc.latitude as number, loc.longitude as number]} icon={DefaultIcon} />
              </MapContainer>
            </div>
          ) : null}
          <Field label="ที่อยู่" value={loc.address} full />
          <div className="dms-pm-create-grid">
            <Field label="ตำบล/แขวง" value={loc.subdistrict} />
            <Field label="อำเภอ/เขต" value={loc.district} />
          </div>
          <div className="dms-pm-create-grid">
            <Field label="จังหวัด" value={loc.province} />
            <Field label="รหัสไปรษณีย์" value={loc.postalCode} />
          </div>
          <div className="dms-pm-create-grid">
            <Field label="ประเทศ" value={loc.country} />
            <Field label="Latitude / Longitude" value={hasCoord ? `${(loc.latitude as number).toFixed(6)}, ${(loc.longitude as number).toFixed(6)}` : undefined} />
          </div>
          {hasCoord ? (
            <div style={{ marginTop: 8 }}>
              <a className="dms-create-btn" href={`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`} target="_blank" rel="noreferrer">เปิดใน Google Maps</a>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* FCP */}
      {hasFcp ? (
        <section className="dms-pm-create-section" style={{ marginTop: 12 }}>
          <h3>Fire Alarm Control Panel (FCP)</h3>
          <div className="dms-pm-create-grid">
            <Field label="ยี่ห้อ FCP" value={survey.fcpBrand} />
            <Field label="รุ่น" value={survey.fcpModel} />
          </div>
          <div className="dms-pm-create-grid">
            <Field label="ประเภท" value={survey.fcpType} />
            <Field label="วัสดุตู้" value={survey.fcpMaterial} />
          </div>
          <Field label="Status" value={FCP_STATUS[survey.fcpStatus ?? ''] ?? survey.fcpStatus} />
        </section>
      ) : null}

      {/* Equipment */}
      {equipment.length > 0 ? (
        <section className="dms-pm-create-section" style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h3 style={{ margin: 0 }}>Equipment Checklist</h3>
            <small className="dms-form-help">มี {haveCount} / {equipment.length} รายการ</small>
          </div>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {equipment.map((e, i) => {
              const yes = isYes(e)
              const key = e.id ? String(e.id) : (e.name ? `${e.name}-${i}` : `equip-${i}`)
              const details = [
                !isEmpty(e.model) ? `Model: ${e.model}` : null,
                !isEmpty(e.qty) ? `จำนวน: ${e.qty}` : null,
              ].filter(Boolean).join(' · ')
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, background: yes ? '#fff' : '#fafafa' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {e.name ? <div style={{ fontWeight: 600, color: yes ? 'inherit' : '#6b7280' }}>{e.name}</div> : null}
                    {yes && details ? <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>{details}</div> : null}
                  </div>
                  {yes && e.photo ? (
                    <img
                      src={e.photo as string}
                      alt={e.name ?? ''}
                      onClick={() => setPreview(e.photo as string)}
                      style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 6, cursor: 'zoom-in' }}
                    />
                  ) : null}
                  <Badge yes={yes} />
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {/* Photos */}
      {photos.length > 0 ? (
        <section className="dms-pm-create-section" style={{ marginTop: 12 }}>
          <h3>รูปถ่าย ({photos.length})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
            {photos.map((p, i) => <PhotoTile key={p.src ? p.src : `photo-${i}`} src={p.src} caption={p.caption} onOpen={setPreview} />)}
          </div>
        </section>
      ) : null}

      {/* Notes */}
      {survey.notes ? (
        <section className="dms-pm-create-section" style={{ marginTop: 12 }}>
          <h3>Notes</h3>
          <div style={{ ...valueBox, whiteSpace: 'pre-wrap' }}>{survey.notes}</div>
        </section>
      ) : null}

      {/* ดูรูปเต็ม */}
      {preview ? (
        <div
          onClick={() => setPreview(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, cursor: 'zoom-out', pointerEvents: 'auto' }}
        >
          <img src={preview} alt="preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
          <button
            type="button"
            aria-label="ปิด"
            onClick={() => setPreview(null)}
            style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 999, border: 'none', background: '#fff', fontSize: 22, cursor: 'pointer' }}
          >×</button>
        </div>
      ) : null}
    </div>
  )
}