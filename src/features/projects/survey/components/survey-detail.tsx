import { useState } from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import type { Survey } from '../types'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import { formatCountry } from './survey-form/utils'
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

// VISIT_TYPE, FCP_STATUS and SURVEY_STATUS are read from translations when available
const VISIT_TYPE: Record<string, string> = {}
const FCP_STATUS: Record<string, string> = {}
const SURVEY_STATUS: Record<string, string> = {}

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

/** แสดงเฉพาะวันที่ (ตัดเวลาออก) รูปแบบ dd/mm/yyyy */
function formatDate(v?: string | null) {
  if (!v) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v))
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v)
}

function Badge({ yes, t }: { yes: boolean; t?: any }) {
  const td = t?.detail ?? {}
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
      background: yes ? '#e6f4ea' : '#f1f3f4', color: yes ? '#1e7e34' : '#6b7280',
    }}>
      {yes ? (td.has ?? 'มี') : (td.no ?? 'ไม่มี')}
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

function PhotoGrid({ items, onOpen }: { items: { src: string; caption: string }[]; onOpen: (src: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
      {items.map((p, i) => <PhotoTile key={p.src || `photo-${i}`} src={p.src} caption={p.caption} onOpen={onOpen} />)}
    </div>
  )
}

export default function SurveyDetail({ survey, onClose: _onClose, onEdit, translations }: { survey: Survey; onClose: () => void; onEdit: (s: Survey) => void, translations?: any }) {
  const t = translations?.features?.survey ?? {}
  const [preview, setPreview] = useState<string | null>(null)

  const equipment = (survey.equipment ?? []) as any[]
  const isYes = (e: any) => e.status === 'yes' || e.isPresent === true
  const haveCount = equipment.filter(isYes).length

  const loc = survey.location
  const hasCoord = !!loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number'

  const hasFcp = [survey.fcpBrand, survey.fcpModel, survey.fcpType, survey.fcpMaterial, survey.fcpStatus, survey.fcpOverview, survey.fcpNameplate, survey.fcpInside].some((v) => !isEmpty(v))
  const hasAddress = !!loc && [loc.address, loc.subdistrict, loc.district, loc.province, loc.postalCode, loc.country].some((v) => !isEmpty(v))

  // localized maps for visit, fcp and status may be provided under translations.status or translations.form.option
  const VISIT_TYPE_LOCAL = t.form?.option ?? {}
  const FCP_STATUS_LOCAL = t.form?.option ?? {}

  return (
    <div>
      {/* Header */}
      <div className="dms-card-head" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>{survey.projectName || (t.detail?.noProjectName ?? '(No project name)')}</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            {survey.surveyDate ? <small className="dms-card-date">{(t.detail?.surveyDateLabel ?? 'Survey date')} {formatDate(survey.surveyDate)}</small> : null}
            {(() => {
              const statusKey = survey.status ?? ''
              const statusLabel = t.status?.[statusKey] ?? statusKey
              return statusKey ? <span className={`dms-card-status is-${statusKey}`}>{String(statusLabel)}</span> : null
            })()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {survey.status === 'draft' && <button type="button" className="dms-create-btn" onClick={() => onEdit(survey)}>{t.detail?.editLabel ?? 'Edit'}</button>}
          <RadixDialog.Close asChild>
            <button type="button" className="dms-back-btn">{t.detail?.closeLabel ?? 'Back'}</button>
          </RadixDialog.Close>
        </div>
      </div>

      {/* Project information */}
      <section className="dms-pm-create-section" style={{ marginTop: 12 }}>
        <h3>{t.form?.section?.projectInfo ?? 'Project information'}</h3>
        <Field label={t.form?.field?.projectName ?? 'Project / Building'} value={survey.projectName} full />
        <div className="dms-pm-create-grid">
          <Field label={t.form?.field?.province ?? 'Province'} value={survey.province} />
          <Field label={t.form?.field?.floors ?? 'Floors'} value={survey.floors} />
        </div>
        <div className="dms-pm-create-grid">
          <Field label={t.form?.field?.contactName ?? 'Contact (name)'} value={survey.contact1?.name} />
          <Field
            label={t.form?.field?.contactPhone ?? 'Contact (phone)'}
            value={survey.contact1?.phone ? <a href={`tel:${survey.contact1.phone}`} style={{ color: '#1a73e8', textDecoration: 'none' }}>{survey.contact1.phone}</a> : undefined}
          />
        </div>
        <div className="dms-pm-create-grid">
          <Field label={t.form?.field?.contactPosition ?? 'Position'} value={survey.contact1?.position} />
          <Field label={t.form?.field?.visitTypeLabel ?? 'Visit type'} value={t.form?.option?.[survey.visitType ?? ''] ?? VISIT_TYPE_LOCAL[survey.visitType ?? ''] ?? survey.visitType} />
        </div>
        {survey.signPhoto ? (
          <div className="dms-form-field dms-form-field--full">
            <span className="dms-form-label">{t.form?.photo?.sign?.label ?? 'Signboard photo'}</span>
            <PhotoGrid items={[{ src: survey.signPhoto, caption: t.form?.photo?.sign?.label ?? 'Signboard photo' }]} onOpen={setPreview} />
          </div>
        ) : null}
      </section>

      {/* Project location */}
      {loc && (hasCoord || hasAddress) ? (
        <section className="dms-pm-create-section" style={{ marginTop: 12 }}>
          <h3>{t.form?.section?.location ?? 'Project location'}</h3>
          {hasCoord ? (
            <div style={{ height: 280, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
              <MapContainer center={[loc.latitude as number, loc.longitude as number]} zoom={16} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[loc.latitude as number, loc.longitude as number]} icon={DefaultIcon} />              </MapContainer>
            </div>
          ) : null}
          <Field label={t.form?.field?.address ?? 'Address'} value={loc.address} full />
          <div className="dms-pm-create-grid">
            <Field label={t.form?.field?.subdistrict ?? 'Subdistrict'} value={loc.subdistrict} />
            <Field label={t.form?.field?.district ?? 'District'} value={loc.district} />
          </div>
          <div className="dms-pm-create-grid">
            <Field label={t.form?.field?.province ?? 'Province'} value={loc.province} />
            <Field label={t.form?.field?.postalCode ?? 'Postal code'} value={loc.postalCode} />
          </div>
          <div className="dms-pm-create-grid">
            <Field label={t.form?.field?.country ?? 'Country'} value={formatCountry(loc.country)} />
            <Field label={t.form?.field?.latlng ?? 'Latitude / Longitude'} value={hasCoord ? `${(loc.latitude as number).toFixed(6)}, ${(loc.longitude as number).toFixed(6)}` : undefined} />
          </div>
          {hasCoord ? (
            <div style={{ marginTop: 8 }}>
              <a className="dms-create-btn" href={`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`} target="_blank" rel="noreferrer">{t.form?.actions?.openInMaps ?? 'Open in Google Maps'}</a>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* FCP */}
      {hasFcp ? (
        <section className="dms-pm-create-section" style={{ marginTop: 12 }}>
          <h3>{t.form?.section?.fcp ?? 'Fire Alarm Control Panel (FCP)'}</h3>
          <div className="dms-pm-create-grid">
            <Field label={t.form?.field?.fcpBrand ?? 'FCP brand'} value={survey.fcpBrand} />
            <Field label={t.form?.field?.fcpModel ?? 'Model'} value={survey.fcpModel} />
          </div>
          <div className="dms-pm-create-grid">
            <Field label={t.form?.field?.fcpType ?? 'Type'} value={survey.fcpType} />
            <Field label={t.form?.field?.fcpMaterial ?? 'Cabinet material'} value={survey.fcpMaterial} />
          </div>
          <Field label={t.form?.field?.fcpStatus ?? 'Status'} value={t.form?.option?.[survey.fcpStatus ?? ''] ?? FCP_STATUS[survey.fcpStatus ?? ''] ?? survey.fcpStatus} />
          {survey.fcpOverview || survey.fcpNameplate || survey.fcpInside ? (
            <div className="dms-form-field dms-form-field--full">
              <span className="dms-form-label">{t.form?.photo?.fcpOverview?.label ?? 'FCP photos'}</span>
              <PhotoGrid
                items={[
                  survey.fcpOverview ? { src: survey.fcpOverview, caption: t.form?.photo?.fcpOverview?.label ?? 'FCP overview' } : null,
                  survey.fcpNameplate ? { src: survey.fcpNameplate, caption: t.form?.photo?.fcpNameplate?.label ?? 'Nameplate / Brand' } : null,
                  survey.fcpInside ? { src: survey.fcpInside, caption: t.form?.photo?.fcpInside?.label ?? 'Inside cabinet' } : null,
                ].filter(Boolean) as { src: string; caption: string }[]}
                onOpen={setPreview}
              />
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Equipment */}
      {equipment.length > 0 ? (
        <section className="dms-pm-create-section" style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h3 style={{ margin: 0 }}>{t.form?.section?.equipment ?? 'Equipment Checklist'}</h3>
            <small className="dms-form-help">{(t.form?.help?.equipmentCount ?? 'Has {have} / {total} items').replace('{have}', String(haveCount)).replace('{total}', String(equipment.length))}</small>
          </div>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {equipment.map((e, i) => {
              const yes = isYes(e)
              const key = e.id ? String(e.id) : (e.name ? `${e.name}-${i}` : `equip-${i}`)
              const details = [
                !isEmpty(e.model) ? `${t.form?.field?.model ?? 'Model'}: ${e.model}` : null,
                !isEmpty(e.qty) ? `${t.form?.field?.qty ?? 'Quantity'}: ${e.qty}` : null,
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
                      style={{ width: 72, height: 54, objectFit: 'cover', borderRadius: 6, cursor: 'zoom-in' }}
                    />
                  ) : null}
                  <Badge yes={yes} t={t} />
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {/* Notes */}
      {survey.notes ? (
        <section className="dms-pm-create-section" style={{ marginTop: 12 }}>
          <h3>{t.form?.section?.notes ?? 'Notes'}</h3>
          <div style={{ ...valueBox, whiteSpace: 'pre-wrap' }}>{survey.notes}</div>
        </section>
      ) : null}

      {/* View full photo */}
      {preview ? (
        <div
          onClick={() => setPreview(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, cursor: 'zoom-out', pointerEvents: 'auto' }}
        >
          <img src={preview} alt="preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
          <button
            type="button"
            aria-label={t.detail?.closeLabel ?? 'Close'}
            onClick={() => setPreview(null)}
            style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 999, border: 'none', background: '#fff', fontSize: 22, cursor: 'pointer' }}
          >×</button>
        </div>
      ) : null}
    </div>
  )
}