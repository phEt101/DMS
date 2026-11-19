import { Fragment, useRef, type FormEvent } from 'react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { addDays, differenceInCalendarDays, format, getDay, isAfter, isBefore, parseISO, startOfDay } from 'date-fns'
import { enUS, th } from 'date-fns/locale'
import type { IconType } from 'react-icons'
import type { DocKind, FormValues } from '../../document-types'
import { formatLeaveDayHour } from '../../leave-duration'
import DocOutingLocationField from './doc-outing-location-field'
import 'react-datepicker/dist/react-datepicker.css'

registerLocale('th', th)
registerLocale('en', enUS)

// Keep any extra calendar gap aligned with personal/vacation validation.
const EXTRA_GAP = 0

function addCalendarDaysAfter(date: string, days: number) {
  return addDays(parseISO(date), days)
}
// จำนวนวันทำการ (ตัดเสาร์-อาทิตย์) — ใช้กับลาเมตตาจิตที่ไม่นับวันหยุดสิ้นสัปดาห์
function countWorkdays(from: Date, to: Date) {
  let count = 0
  for (let d = from; !isAfter(d, to); d = addDays(d, 1)) { const dow = getDay(d); if (dow !== 0 && dow !== 6) count += 1 }
  return count
}
const SPECIAL_LEAVE_HINTS: Record<string, string> = {
  ordain: 'ordinationHint',
  compassionate_employee_family: 'compassionateEmployeeFamilyHint',
  compassionate_spouse_parent: 'compassionateSpouseParentHint',
  maternity: 'maternityHint',
  childcare_after_maternity: 'childcareAfterMaternityHint',
  spouse_childbirth: 'spouseChildbirthHint',
}
// TODO: เปิดขั้นพัฒนาเมื่อพร้อมใช้งาน — ot: ขอทำงานล่วงเวลา (OT), timefix: ขอแก้ไขเวลาเข้า–ออกงาน
const HIDDEN_KINDS: DocKind[] = ['ot', 'timefix']
type Field = { key: string; label: string; type: 'text' | 'date' | 'time' | 'number' | 'textarea' | 'select' | 'checkbox'; options?: Record<string, string>; step?: number; wide?: boolean; hint?: string }
type Check = { ok: boolean; message: string; key?: string }
const TIME_HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'))
const TIME_MINUTES = ['00', '30']

function TimeField({ value, required, language, onChange }: { value: string; required: boolean; language: 'th' | 'en'; onChange: (value: string) => void }) {
  const [hour, minute] = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)?.slice(1) ?? ['', '']

  return <div className="documents-time-picker">
    <select className="dms-form-input" aria-label={language === 'th' ? 'ชั่วโมง' : 'Hour'} required={required} value={hour} onChange={event => onChange(event.target.value ? `${event.target.value}:${minute || '00'}` : '')}>
      <option value="">HH</option>
      {TIME_HOURS.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
    <span aria-hidden="true">:</span>
    <select className="dms-form-input" aria-label={language === 'th' ? 'นาที' : 'Minute'} required={required} disabled={!hour} value={minute} onChange={event => onChange(event.target.value ? `${hour}:${event.target.value}` : '')}>
      <option value="">MM</option>
      {TIME_MINUTES.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
  </div>
}

// คำอธิบายใต้ช่องกรอก (fieldHints / kindFieldHints) ย้ายไปอยู่ใน th.json / en.json แล้ว
// map ผลตรวจ (validation key จาก server/mock) → ช่องกรอกที่เกี่ยวข้อง
const CHECK_FIELD: Record<string, string> = {
  dateRange: 'from', overlap: 'from', personalLead: 'from', vacationLead: 'from', emergencyFromToday: 'from', withinYear: 'from', todayOrFuture: 'from', validRange: 'from', outingRange: 'from', specialLeaveWindow: 'childBirthDate', childcareMustFollowMaternity: 'from',
  compassionateRelationRequired: 'compassionateRelation',
  endAfterStart: 'end', emergencyHours: 'end', hourlyLeaveLimit: 'hours', otLimit: 'end', backAfterOut: 'backTime',
  daysPositive: 'days', leaveBalance: 'days', usePersonalFirst: 'days', vacationBalance: 'days',
  leaveReason: 'reason', emergencyReason: 'reason', otReason: 'reason', detailsRequired: 'reason', reasonRequired: 'reason',
  otDate: 'date', pastDate: 'date', fixLimit: 'date',
  taskRequired: 'task', placeRequired: 'place', planRequired: 'plan',
  outTimeRequired: 'outTime', timeRequired: 'inTime', companyRequired: 'company', addressRequired: 'address',
  projectRequired: 'project', customerNameRequired: 'customerName', phoneRequired: 'phone',
  workDetailsRequired: 'workDetails', phoneInvalid: 'phone', specialLeaveLimit: 'from', certificateRequired: 'cert',
}
type Props = { open: boolean; selectedKind: DocKind | ''; resubmission?: { no: string; note?: string }; kindInfo: Record<DocKind, { title: string; description: string; icon: IconType }>; fields: Record<DocKind, Field[]>; values: FormValues; checks: Check[]; validating: boolean; today: string; leadPersonal: number; leadVacation: number; hoursPerDay: number; hourStep: number; fixDays: number; ordainMaxDays: number; compassionateEmployeeMaxDays: number; compassionateEmployeePaidDays: number; compassionateSpouseParentMaxDays: number; compassionateSpouseParentPaidDays: number; maternityMaxDays: number; childcareMaxDays: number; childcarePayPercent: number; spouseChildbirthMaxDays: number; spouseChildbirthWindowDays: number; language: 'th' | 'en'; role: string; medicalCertificateFile: File | null; supportingDocumentFiles: File[]; certificateRequired: boolean; onMedicalCertificateFile: (file: File | null) => void; onSupportingDocumentFiles: (files: File[]) => void; onRemoveSupportingDocumentFile: (index: number) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void; onClearKind: () => void; onPickKind: (kind: DocKind) => void; onChange: (key: string, value: string | boolean) => void; copy: any; translations: any }

export default function DocNewDocumentModal(p: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  // คลิกข้อความแจ้งเตือนที่ยังไม่ผ่าน (!) → เลื่อนไปโฟกัสช่องที่กรอกผิด/ยังไม่กรอก
  const focusField = (key?: string) => {
    const field = key ? CHECK_FIELD[key] : undefined
    if (!field || !formRef.current) return
    const input = formRef.current.querySelector<HTMLElement>(`[data-field="${field}"]`)
    if (input) { input.scrollIntoView({ behavior: 'smooth', block: 'center' }); input.focus({ preventScroll: true }) }
  }
  if (!p.open) return null
  // ผู้ยื่นเป็นพนักงานทั่วไป (ไม่ใช่ HR/ผู้จัดการ) — รองรับทั้งค่า role code และข้อความที่แสดงผลทั้ง TH/EN
  const isEmployee = p.role === 'พนักงาน' || p.role === 'user' || p.role === p.copy.roles?.employee

  // ── วันที่ที่ใช้คำนวณปฏิทิน (ไม่ขึ้นกับ field จึงคำนวณครั้งเดียวนอก loop) ──
  const todayStart = startOfDay(parseISO(p.today))
  const isLeave = p.selectedKind === 'leave'
  const vacation = isLeave && p.values.leaveType === 'vacation'
  const personal = isLeave && ['personal', 'unpaid'].includes(String(p.values.leaveType))

  // วันแรกที่นโยบายอนุญาตให้ลา (undefined = ไม่มีข้อจำกัดล่วงหน้า เช่น ลาป่วย/ลาฉุกเฉิน)
  // Vacation notice counts today as day 1, so a 15-day notice starts 14 days after today.
  const leaveMinDate = vacation
    ? addCalendarDaysAfter(p.today, Math.max(0, p.leadVacation - 1) + EXTRA_GAP)
    : personal
      ? addCalendarDaysAfter(p.today, Math.max(0, p.leadPersonal) + EXTRA_GAP)
      : undefined
  const policyMin = leaveMinDate ? startOfDay(leaveMinDate) : undefined

  // นโยบาย: แก้ไขเวลาย้อนหลังได้ไม่เกิน fixDays วัน — ใช้กับทั้ง timefix และ outing (ขอออกนอกสถานที่)
  const fixMinDate = (p.selectedKind === 'timefix' || p.selectedKind === 'outing') && p.fixDays > 0
    ? addDays(parseISO(p.today), -p.fixDays)
    : undefined

  const fromDate = String(p.values.from ?? '') ? parseISO(String(p.values.from)) : undefined
  const leaveType = String(p.values.leaveType ?? '')
  const documentRequirements = p.copy.submission.documentRequirements
  const documentRequirement = leaveType === 'compassionate_employee_family'
    ? documentRequirements?.[leaveType]?.[String(p.values.compassionateRelation ?? '')]
    : documentRequirements?.[leaveType]
  const requiresSupportingDocuments = Boolean(documentRequirements?.[leaveType])
  const compassionateSpouseParent = p.values.compassionateRelation === 'spouse_parent'
  const specialLeaveMaxDays = p.values.leaveType === 'compassionate_employee_family'
    ? compassionateSpouseParent ? p.compassionateSpouseParentMaxDays : p.compassionateEmployeeMaxDays
    : p.values.leaveType === 'ordain' ? p.ordainMaxDays
      : p.values.leaveType === 'compassionate_spouse_parent' ? p.compassionateSpouseParentMaxDays
        : p.values.leaveType === 'maternity' ? p.maternityMaxDays
          : p.values.leaveType === 'childcare_after_maternity' ? p.childcareMaxDays : p.spouseChildbirthMaxDays
  const specialLeavePaidDays = leaveType === 'compassionate_spouse_parent'
    ? p.compassionateSpouseParentPaidDays
    : compassionateSpouseParent ? p.compassionateSpouseParentPaidDays : p.compassionateEmployeePaidDays

  return <div className="documents-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) p.onClose() }}><form ref={formRef} className="dms-modal dms-create-doc-modal documents-submission-modal" onSubmit={p.onSubmit}>
    <h2 className="dms-modal-title">{p.resubmission ? p.copy.submission.resubmitTitle : p.selectedKind ? p.kindInfo[p.selectedKind].title : p.copy.submission.title}</h2><p className="dms-modal-subtitle">{p.resubmission ? p.copy.submission.resubmitInstructions : p.selectedKind ? p.copy.submission.instructions : p.copy.submission.intro}</p><button type="button" className="modal-close" aria-label={p.copy.detail.close} onClick={p.onClose}>×</button>
    <div className="dms-create-doc-body documents-submission-body">{!p.selectedKind ? <div className="documents-kind-grid">{(Object.keys(p.kindInfo) as DocKind[]).filter(kind => !HIDDEN_KINDS.includes(kind)).map(kind => { const info = p.kindInfo[kind]; const Icon = info.icon; const merged = kind === 'outing'; return <button type="button" key={kind} onClick={() => p.onPickKind(kind)}><span className="documents-icon"><Icon /></span><span><b>{info.title}</b><small>{merged ? p.copy.submission.offsiteDescription : info.description}</small></span></button> })}</div> : <>
      {!p.resubmission && <button type="button" className="dms-back-btn documents-form-back" onClick={p.onClearKind}>{p.copy.submission.changeKind}</button>}
      {p.resubmission && <p className="documents-policy-note">{String(p.copy.submission.resubmitNotice).replace('{no}', p.resubmission.no)}{p.resubmission.note ? ` ${p.copy.detail.rejectionNote}: ${p.resubmission.note}` : ''}</p>}
      {p.selectedKind === 'leave' && SPECIAL_LEAVE_HINTS[String(p.values.leaveType)] && (() => { const hintKey = SPECIAL_LEAVE_HINTS[String(p.values.leaveType)]; return <p className="documents-policy-note">
        {String(p.copy.submission[SPECIAL_LEAVE_HINTS[String(p.values.leaveType)]])
          .replace('{max}', String(specialLeaveMaxDays))
          .replace('{paid}', String(specialLeavePaidDays))
          .replace('{percent}', String(p.childcarePayPercent))
          .replace('{window}', String(p.spouseChildbirthWindowDays))}
        {p.values.from && p.values.to && String(p.values.to) >= String(p.values.from)
          ? ` ${p.language === 'th' ? `เลือกแล้ว ${hintKey === 'compassionateEmployeeFamilyHint' || hintKey === 'compassionateSpouseParentHint' ? countWorkdays(parseISO(String(p.values.from)), parseISO(String(p.values.to))) : differenceInCalendarDays(parseISO(String(p.values.to)), parseISO(String(p.values.from))) + 1} วัน` : `${hintKey === 'compassionateEmployeeFamilyHint' || hintKey === 'compassionateSpouseParentHint' ? countWorkdays(parseISO(String(p.values.from)), parseISO(String(p.values.to))) : differenceInCalendarDays(parseISO(String(p.values.to)), parseISO(String(p.values.from))) + 1} days selected`}`
          : ''}
      </p> })()}
      {p.selectedKind === 'timefix' && p.fixDays > 0 && <p className="documents-policy-note">{p.copy.policy?.fixDaysNote?.replace('{days}', String(p.fixDays)) ?? (p.language === 'th' ? `นโยบายการลา: แก้ไขเวลาย้อนหลังได้ไม่เกิน ${p.fixDays} วัน` : `Leave policy: time corrections are allowed up to ${p.fixDays} days back`)}</p>}
      <div className="documents-form-fields">{p.fields[p.selectedKind].map(field => {
        const value = p.values[field.key] ?? (field.type === 'checkbox' ? false : '')
        const calculatedLeaveHours = field.key === 'hours' && p.selectedKind === 'leave'
        const displayValue = calculatedLeaveHours
          ? Number(value) > 0
            ? formatLeaveDayHour(Number(value) / p.hoursPerDay, p.hoursPerDay, p.copy.ledger.day, p.copy.ledger.hour, p.copy.ledger.minute, p.hourStep)
            : ''
          : String(value)
        const emergency = p.selectedKind === 'leave' && (p.values.leaveType === 'emergency' || p.values.leaveType === 'personal' || p.values.leaveType === 'sick')
        const hourly = emergency && p.values.byHour === true
        const calendarLeave = p.selectedKind === 'leave' && Boolean(SPECIAL_LEAVE_HINTS[String(p.values.leaveType)])
        if (field.key === 'compassionateRelation' && p.values.leaveType !== 'compassionate_employee_family') return null
        if (field.key === 'childBirthDate' && p.values.leaveType !== 'spouse_childbirth') return null
        if (field.key === 'byHour' && !emergency) return null
        if (field.key === 'cert') return null
        if (field.key === 'days') return null
        if (field.key === 'hours' && calendarLeave) return null
        if (p.selectedKind === 'leave' && ['start', 'end'].includes(field.key) && !hourly) return null

        const hint = field.hint
          ?? (p.selectedKind ? p.copy.kindFieldHints?.[p.selectedKind]?.[field.key] : undefined)
          ?? p.copy.fieldHints?.[field.key]
          ?? (field.type === 'date' ? p.copy.submission.hintDate
            : field.type === 'time' ? p.copy.submission.hintTime
              : field.type === 'number' ? p.copy.submission.hintNumber
                : undefined)

        // ปฏิทิน: outing/timefix ย้อนหลังได้ไม่เกิน fixDays วัน · leave ใช้กฎยื่นล่วงหน้า
        // (ประกาศก่อน dayClassName เพื่อให้อ่านง่ายและไม่พึ่ง closure)
        const minDate = p.selectedKind === 'leave' && field.key === 'from'
          ? leaveMinDate
          : p.selectedKind === 'leave' && field.key === 'to'
            ? fromDate ?? leaveMinDate
            : (p.selectedKind === 'timefix' && field.key === 'date') || (p.selectedKind === 'outing' && field.key === 'from')
              ? fixMinDate
              : p.selectedKind === 'outing' && field.key === 'to' && fromDate
                ? fromDate
                : undefined

        // ไฮไลต์วันติดกันตามนโยบายเฉพาะวันลาพักร้อน โดยเริ่มนับจากวันนี้
        // - แดง = ตั้งแต่วันนี้จนถึงก่อนวันแรกที่นโยบายอนุญาตให้เลือก
        // - เทา = เสาร์-อาทิตย์
        const isLeaveDateField = isLeave && (field.key === 'from' || field.key === 'to')
        const isVacationDateField = vacation && (field.key === 'from' || field.key === 'to')
        const dayClassName = field.type === 'date' ? (date: Date) => {
          const d = startOfDay(date)
          const dow = getDay(d)
          const inBlocked = Boolean(isVacationDateField && policyMin && !isBefore(d, todayStart) && isBefore(d, policyMin))
          if (inBlocked && policyMin) {
            // ช่วงห้ามเลือก (ตั้งแต่วันนี้ → ก่อนวันแรกที่เลือกได้) ไฮไลเป็นแถบเดียวต่อกัน รวมเสาร์-อาทิตย์
            // ปลายซ้าย/ขวาของแถบ: วันแรก/วันสุดท้ายของช่วง หรือต้น/ท้ายสัปดาห์ (อา./ส.) ให้มนเป็นแถบต่อสัปดาห์
            const isFirst = isBefore(addDays(d, -1), todayStart)
            const isLast = !isBefore(addDays(d, 1), policyMin)
            return [
              'documents-day-blocked',
              (isFirst || dow === 0) && 'documents-day-blocked--start',
              (isLast || dow === 6) && 'documents-day-blocked--end',
            ].filter(Boolean).join(' ')
          }
          // เสาร์-อาทิตย์นอกช่วงห้ามเลือก = เทา
          return isLeaveDateField && (dow === 0 || dow === 6) ? 'documents-day-weekend' : ''
        } : undefined

        const required = p.selectedKind === 'outing'
          ? ['from', 'to', 'outTime', 'company', 'project', 'customerName', 'phone', 'workDetails'].includes(field.key)
          : field.key === 'compassionateRelation'
            ? p.values.leaveType === 'compassionate_employee_family'
          : field.key === 'childBirthDate'
            ? p.values.leaveType === 'spouse_childbirth'
          : field.type !== 'checkbox'

        return <Fragment key={field.key}>{p.selectedKind === 'outing' && field.key === 'project' && <DocOutingLocationField values={p.values} onChange={p.onChange} translations={p.translations} />}<label className={`dms-form-field dms-submission-field ${field.wide ? 'dms-form-field--full' : ''} ${field.type === 'checkbox' ? 'is-checkbox' : ''}`} data-field={field.key}><span className="dms-form-label">
          {field.label}
          {required && (
              <span className="dms-form-required" aria-hidden="true">
                *
              </span>
            )}
        </span>
          {field.type === 'textarea' ? <textarea className="dms-form-input dms-form-textarea" rows={3} required={required} value={String(value)} onChange={e => p.onChange(field.key, e.target.value)} /> : field.type === 'select' ? <select className="dms-form-input" required={required} value={String(value)} onChange={e => p.onChange(field.key, e.target.value)}>{Object.entries(field.options ?? {}).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select> : field.type === 'checkbox' ? <input className="dms-form-input documents-checkbox" type="checkbox" checked={Boolean(value)} onChange={e => p.onChange(field.key, e.target.checked)} />           : field.key === 'hours' && p.selectedKind === 'leave' ? <input className="dms-form-input is-calculated" type="text" required={required} disabled value={displayValue} /> : field.type === 'date' ? <DatePicker className="dms-form-input" required={required} selected={String(value) ? parseISO(String(value)) : null} onChange={(date: Date | null) => p.onChange(field.key, date ? format(date, 'yyyy-MM-dd') : '')} dateFormat={p.language === 'th' ? 'd MMM yyyy' : 'MMM d, yyyy'} locale={p.language} filterDate={date => !minDate || !isBefore(startOfDay(date), startOfDay(minDate))} dayClassName={dayClassName} openToDate={(vacation || personal) && field.key === 'from' && !value ? minDate : undefined} strictParsing placeholderText={p.copy.submission.hintDate} /> : field.type === 'time' ? <TimeField value={String(value)} required={required} language={p.language} onChange={value => p.onChange(field.key, value)} /> : <input className="dms-form-input" type={field.type} required={required} min={field.type === 'number' ? 0 : undefined} step={field.type === 'number' && field.key === 'hours' && p.selectedKind === 'leave' ? 0.5 : field.step} readOnly={field.key === 'hours' && p.selectedKind === 'ot' || field.key === 'days' && (p.selectedKind === 'leave' && hourly || p.selectedKind === 'ot')} value={String(value)} onChange={e => p.onChange(field.key, e.target.value)} />}{hint && <small className="dms-form-hint">{hint}</small>}</label></Fragment>
      })}</div>
      {p.selectedKind === 'leave' && p.values.leaveType === 'sick' && <label className="dms-form-field dms-submission-field dms-form-field--full" data-field="cert">
        <span className="dms-form-label">{p.copy.submission.medicalCertificateLabel}{p.certificateRequired ? ' *' : ''}</span>
        <input className="dms-form-input" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" required={p.certificateRequired && !p.medicalCertificateFile} onChange={event => p.onMedicalCertificateFile(event.target.files?.[0] ?? null)} />
        <small>{p.copy.submission.medicalCertificateHelp}</small>
        {p.medicalCertificateFile && <div className="documents-certificate-selected"><span>{p.medicalCertificateFile.name}</span><button type="button" className="dms-back-btn" onClick={() => p.onMedicalCertificateFile(null)}>{p.copy.submission.removeCertificate}</button></div>}
      </label>}
      {p.selectedKind === 'leave' && documentRequirement && <p className="documents-policy-note">{documentRequirement}</p>}
      {p.selectedKind === 'leave' && requiresSupportingDocuments && <label className="dms-form-field dms-submission-field dms-form-field--full">
        <span className="dms-form-label">{p.copy.submission.supportingDocumentsLabel} *</span>
        <input
          className="dms-form-input"
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          required={p.supportingDocumentFiles.length === 0}
          onChange={event => {
            p.onSupportingDocumentFiles(Array.from(event.target.files ?? []))
            event.target.value = ''
          }}
        />
        <small>{p.copy.submission.supportingDocumentsHelp}</small>
        {p.supportingDocumentFiles.map((file, index) => <div className="documents-certificate-selected" key={`${file.name}-${file.size}-${index}`}>
          <span>{file.name}</span>
          <button type="button" className="dms-back-btn" onClick={() => p.onRemoveSupportingDocumentFile(index)}>
            {p.copy.submission.removeCertificate}
          </button>
        </div>)}
      </label>}
      <ul className="documents-validation-list" aria-live="polite" aria-busy={p.validating}>{p.validating && <li className="is-invalid">{p.copy.submission.validationChecking}</li>}{p.checks.map((check, index) => <li key={`${index}-${check.message}`} className={check.ok ? 'is-valid' : 'is-invalid'} onClick={() => { if (!check.ok) focusField(check.key) }} style={!check.ok ? { cursor: 'pointer' } : undefined} title={!check.ok ? p.copy.submission.clickToFix : undefined}><b>{check.ok ? '✓' : '!'}</b>{check.message}</li>)}</ul><p className="documents-submit-route">{p.copy.submission.afterSign} {isEmployee ? p.copy.submission.manager : p.copy.submission.hr}</p>
      <div className="documents-modal-actions documents-submission-actions">{!p.resubmission && <button type="button" className="dms-back-btn" onClick={p.onClearKind}>{p.copy.submission.backToKinds}</button>}<button type="submit" className="dms-create-btn" disabled={p.validating || p.checks.some(check => !check.ok)}>{p.copy.submission.signAndSend}</button></div>
    </>}</div>
  </form></div>
}