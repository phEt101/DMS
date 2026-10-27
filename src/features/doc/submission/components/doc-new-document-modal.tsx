import { Fragment, useRef, type FormEvent } from 'react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { addDays, format, getDay, parseISO } from 'date-fns'
import { enUS, th } from 'date-fns/locale'
import type { IconType } from 'react-icons'
import type { DocKind, FormValues } from '../../document-types'
import DocOutingLocationField from './doc-outing-location-field'
import 'react-datepicker/dist/react-datepicker.css'

registerLocale('th', th)
registerLocale('en', enUS)

function addWorkdaysAfter(date: string, workdays: number) {
 let result = parseISO(date)
 let counted = 0
 while (counted < workdays) {
  result = addDays(result, 1)
  const day = getDay(result)
  if(day!==0&&day!==6)counted+=1
 }
 return result
}
function addCalendarDaysAfter(date: string, days: number) {
 return addDays(parseISO(date), days)
}
// TODO: เปิดขั้นพัฒนาเมื่อพร้อมใช้งาน — ot: ขอทำงานล่วงเวลา (OT), timefix: ขอแก้ไขเวลาเข้า–ออกงาน
const HIDDEN_KINDS: DocKind[] = ['ot', 'timefix']
type Field={key:string;label:string;type:'text'|'date'|'time'|'number'|'textarea'|'select'|'checkbox';options?:Record<string,string>;step?:number;wide?:boolean;hint?:string}
type Check={ok:boolean;message:string;key?:string}
// คำอธิบายใต้ช่องกรอก (fieldHints / kindFieldHints) ย้ายไปอยู่ใน th.json / en.json แล้ว
// map ผลตรวจ (validation key จาก server/mock) → ช่องกรอกที่เกี่ยวข้อง
const CHECK_FIELD: Record<string,string> = {
  dateRange:'from', overlap:'from', personalLead:'from', vacationLead:'from', emergencyFromToday:'from', withinYear:'from', todayOrFuture:'from', validRange:'from',
  endAfterStart:'end', emergencyHours:'end', hourlyLeaveLimit:'hours', otLimit:'end', backAfterOut:'backTime',
  daysPositive:'days', leaveBalance:'days', usePersonalFirst:'days', vacationBalance:'days',
  leaveReason:'reason', emergencyReason:'reason', otReason:'reason', detailsRequired:'reason', reasonRequired:'reason',
  otDate:'date', pastDate:'date', fixLimit:'date',
  taskRequired:'task', placeRequired:'place', planRequired:'plan',
  outTimeRequired:'outTime', timeRequired:'inTime', companyRequired:'company', addressRequired:'address',
  workDetailsRequired:'workDetails', phoneInvalid:'phone', certificateRequired:'cert',
}
type Props={open:boolean;selectedKind:DocKind|'';kindInfo:Record<DocKind,{title:string;description:string;icon:IconType}>;fields:Record<DocKind,Field[]>;values:FormValues;checks:Check[];validating:boolean;today:string;leadPersonal:number;leadVacation:number;language:'th'|'en';role:string;medicalCertificateFile:File|null;certificateRequired:boolean;onMedicalCertificateFile:(file:File|null)=>void;onSubmit:(event:FormEvent<HTMLFormElement>)=>void;onClose:()=>void;onClearKind:()=>void;onPickKind:(kind:DocKind)=>void;onChange:(key:string,value:string|boolean)=>void;copy:any;translations:any}
export default function DocNewDocumentModal(p:Props){
 const formRef=useRef<HTMLFormElement>(null)
 // คลิกข้อความแจ้งเตือนที่ยังไม่ผ่าน (!) → เลื่อนไปโฟกัสช่องที่กรอกผิด/ยังไม่กรอก
 const focusField=(key?:string)=>{
  const field=key?CHECK_FIELD[key]:undefined
  if(!field||!formRef.current)return
  const input=formRef.current.querySelector<HTMLElement>(`[data-field="${field}"]`)
  if(input){input.scrollIntoView({behavior:'smooth',block:'center'});input.focus({preventScroll:true})}
 }
 if(!p.open)return null
 // ผู้ยื่นเป็นพนักงานทั่วไป (ไม่ใช่ HR/ผู้จัดการ) — รองรับทั้งค่า role code และข้อความที่แสดงผลทั้ง TH/EN
 const isEmployee=p.role==='พนักงาน'||p.role==='user'||p.role===p.copy.roles?.employee
 return <div className="documents-modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)p.onClose()}}><form ref={formRef} className="dms-modal dms-create-doc-modal documents-submission-modal" onSubmit={p.onSubmit}>
  <h2 className="dms-modal-title">{p.selectedKind?p.kindInfo[p.selectedKind].title:p.copy.submission.title}</h2><p className="dms-modal-subtitle">{p.selectedKind?p.copy.submission.instructions:p.copy.submission.intro}</p><button type="button" className="modal-close" aria-label={p.copy.detail.close} onClick={p.onClose}>×</button>
  <div className="dms-create-doc-body documents-submission-body">{!p.selectedKind?<div className="documents-kind-grid">{(Object.keys(p.kindInfo) as DocKind[]).filter(kind=>!HIDDEN_KINDS.includes(kind)).map(kind=>{const info=p.kindInfo[kind];const Icon=info.icon;const merged=kind==='outing';return <button type="button" key={kind} onClick={()=>p.onPickKind(kind)}><span className="documents-icon"><Icon/></span><span><b>{info.title}</b><small>{merged?p.copy.submission.offsiteDescription:info.description}</small></span></button>})}</div>:<>
   <button type="button" className="dms-back-btn documents-form-back" onClick={p.onClearKind}>{p.copy.submission.changeKind}</button>
   <div className="documents-form-fields">{p.fields[p.selectedKind].map(field=>{const value=p.values[field.key]??(field.type==='checkbox'?false:'');const emergency=p.selectedKind==='leave'&&p.values.leaveType==='emergency';const hourly=emergency&&p.values.byHour===true;if(field.key==='byHour'&&(!emergency||p.values.hours))return null;if(field.key==='cert')return null;if(field.key==='days')return null;if(p.selectedKind==='leave'&&['start','end'].includes(field.key)&&!hourly)return null;
    const hint=field.hint
     ??(p.selectedKind?p.copy.kindFieldHints?.[p.selectedKind]?.[field.key]:undefined)
     ??p.copy.fieldHints?.[field.key]
     ??(field.type==='date'?p.copy.submission.hintDate
      :field.type==='time'?p.copy.submission.hintTime
      :field.type==='number'?p.copy.submission.hintNumber
      :undefined)
    const vacation = p.selectedKind === 'leave' && p.values.leaveType === 'vacation'
    const personal = p.selectedKind === 'leave' && ['personal', 'unpaid'].includes(String(p.values.leaveType))
    const leaveMinDate = vacation
      ? addWorkdaysAfter(p.today, Math.max(0, p.leadVacation))
      : personal
        ? addCalendarDaysAfter(p.today, Math.max(0, p.leadPersonal))
        : undefined
    const fromDate = String(p.values.from ?? '') ? parseISO(String(p.values.from)) : undefined
    const minDate = p.selectedKind === 'leave' && field.key === 'from'
      ? leaveMinDate
      : p.selectedKind === 'leave' && field.key === 'to'
        ? fromDate ?? leaveMinDate
        : p.selectedKind === 'outing' && field.key === 'from'
          ? parseISO(p.today)
          : p.selectedKind === 'outing' && field.key === 'to' && fromDate
            ? fromDate
            : undefined
    return <Fragment key={field.key}>{p.selectedKind==='outing'&&field.key==='project'&&<DocOutingLocationField values={p.values} onChange={p.onChange} translations={p.translations}/>}<label className={`dms-form-field dms-submission-field ${field.wide?'dms-form-field--full':''} ${field.type==='checkbox'?'is-checkbox':''}`} data-field={field.key}><span className="dms-form-label">{field.label}{field.type!=='checkbox'&&<span className="dms-form-required" aria-hidden="true"> *</span>}</span>{field.type==='textarea'?<textarea className="dms-form-input dms-form-textarea" rows={3} value={String(value)} onChange={e=>p.onChange(field.key,e.target.value)}/>:field.type==='select'?<select className="dms-form-input" value={String(value)} onChange={e=>p.onChange(field.key,e.target.value)}>{Object.entries(field.options??{}).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>:field.type==='checkbox'?<input className="dms-form-input documents-checkbox" type="checkbox" checked={Boolean(value)} onChange={e=>p.onChange(field.key,e.target.checked)}/>:field.type==='date'?<DatePicker className="dms-form-input" selected={String(value)?parseISO(String(value)):null} onChange={(date:Date|null)=>p.onChange(field.key,date?format(date,'yyyy-MM-dd'):'')} dateFormat={p.language==='th'?'d MMM yyyy':'MMM d, yyyy'} locale={p.language} minDate={minDate} openToDate={(vacation||personal)&&field.key==='from'&&!value?minDate:undefined} strictParsing placeholderText={p.copy.submission.hintDate}/>:<input className="dms-form-input" type={field.type} min={field.type==='number'?0:undefined} step={field.type==='number'&&field.key==='hours'&&p.selectedKind==='leave'?0.5:field.step} readOnly={field.key==='hours'&&p.selectedKind==='ot'||field.key==='days'&&(p.selectedKind==='leave'&&hourly||p.selectedKind==='ot')} value={String(value)} onChange={e=>p.onChange(field.key,e.target.value)}/>}{hint&&<small className="dms-form-hint">{hint}</small>}</label></Fragment>
   })}</div>
   {p.selectedKind==='leave'&&p.values.leaveType==='sick'&&<label className="dms-form-field dms-submission-field dms-form-field--full" data-field="cert">
    <span className="dms-form-label">{p.copy.submission.medicalCertificateLabel}{p.certificateRequired?' *':''}</span>
    <input className="dms-form-input" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" required={p.certificateRequired&&!p.medicalCertificateFile} onChange={event=>p.onMedicalCertificateFile(event.target.files?.[0]??null)}/>
    <small>{p.copy.submission.medicalCertificateHelp}</small>
    {p.medicalCertificateFile&&<div className="documents-certificate-selected"><span>{p.medicalCertificateFile.name}</span><button type="button" className="dms-back-btn" onClick={()=>p.onMedicalCertificateFile(null)}>{p.copy.submission.removeCertificate}</button></div>}
   </label>}
   <ul className="documents-validation-list" aria-live="polite" aria-busy={p.validating}>{p.validating&&<li className="is-invalid">{p.copy.submission.validationChecking}</li>}{p.checks.map((check,index)=><li key={`${index}-${check.message}`} className={check.ok?'is-valid':'is-invalid'} onClick={()=>{if(!check.ok)focusField(check.key)}} style={!check.ok?{cursor:'pointer'}:undefined} title={!check.ok?p.copy.submission.clickToFix:undefined}><b>{check.ok?'✓':'!'}</b>{check.message}</li>)}</ul><p className="documents-submit-route">{p.copy.submission.afterSign} {isEmployee?p.copy.submission.manager:p.copy.submission.hr}</p>
   <div className="documents-modal-actions documents-submission-actions"><button type="button" className="dms-back-btn" onClick={p.onClearKind}>{p.copy.submission.backToKinds}</button><button type="submit" className="dms-create-btn" disabled={p.validating||p.checks.some(check=>!check.ok)}>{p.copy.submission.signAndSend}</button></div>
  </>}</div>
 </form></div>
}