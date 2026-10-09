import type { UseFormReturn } from 'react-hook-form'
import { useEffect } from 'react'
import { formatDateForInput } from './utils'
import type { Survey } from '../../types'
import PhotoField from './survey-formPhotoField'
import type { usePhotos } from './usePhotos'

const Required = () => <span className="required-mark" style={{ color: 'red' }}>*</span>

export default function ProjectSection({
  form,
  photos,
  openCamera,
}: {
  form: UseFormReturn<Survey>
  photos: ReturnType<typeof usePhotos>
  openCamera: (target: string) => void
}) {
  const { register, watch, setValue } = form

  // ensure surveyDate is in yyyy-MM-dd format for <input type="date"> to avoid React warnings
  useEffect(() => {
    const v = watch('surveyDate') as string | undefined
    if (v && v.includes('T')) {
      const normalized = formatDateForInput(v)
      if (normalized && normalized !== v) setValue('surveyDate', normalized)
    }
  }, [watch, setValue])

  return (
    <section className="dms-pm-create-section">
      <h3>ข้อมูลโครงการ</h3>
      <label className="dms-form-field">
        <span className="dms-form-label">วันที่สำรวจ <Required /></span>
        <input className="dms-form-input" type="date" {...register('surveyDate', { required: true })} />
        <small className="dms-form-help">วันที่ทำการสำรวจ (เลือกวันที่)</small>
      </label>
      <label className="dms-form-field">
        <span className="dms-form-label">ชื่อโครงการ / อาคาร <Required /></span>
        <input className="dms-form-input" placeholder="เช่น อาคารสำนักงานใหญ่" {...register('projectName', { required: true })} />
        <small className="dms-form-help">ชื่ออาคารหรือโครงการที่เข้าตรวจ</small>
      </label>
      <div className="dms-pm-create-grid">
        <label className="dms-form-field">
          <span className="dms-form-label">จำนวนชั้น</span>
          <input className="dms-form-input" type="number" placeholder="เช่น 5" {...register('floors', { valueAsNumber: true })} />
          <small className="dms-form-help">จำนวนชั้นทั้งหมดของอาคาร</small>
        </label>
      </div>

      <div className="dms-pm-create-grid">
        <label className="dms-form-field">
          <span className="dms-form-label">ผู้ติดต่อ (ชื่อ) <Required /></span>
          <input className="dms-form-input" placeholder="เช่น นายสมชาย ใจดี" {...register('contact1.name', { required: true })} />
          <small className="dms-form-help">ชื่อผู้ประสานงานหน้างาน</small>
        </label>
        <label className="dms-form-field">
          <span className="dms-form-label">ผู้ติดต่อ (โทรศัพท์) <Required /></span>
          <input className="dms-form-input" placeholder="เช่น 0812345678" {...register('contact1.phone', { required: true })} />
          <small className="dms-form-help">หมายเลขที่ติดต่อได้</small>
        </label>
      </div>
      <div className="dms-pm-create-grid">
        <label className="dms-form-field">
          <span className="dms-form-label">ตำแหน่ง <Required /></span>
          <input className="dms-form-input" placeholder="เช่น หัวหน้างาน" {...register('contact1.position', { required: true })} />
          <small className="dms-form-help">ตำแหน่งของผู้ติดต่อ</small>
        </label>
        <label className="dms-form-field">
          <span className="dms-form-label">ประเภทการเยี่ยม</span>
          <select className="dms-form-input" {...register('visitType')}>
            <option value="">เลือก</option>
            <option value="contact_new">ติดต่อเข้าพบใหม่</option>
            <option value="ref_doc">อ้างอิงเอกสารที่เคยขาย</option>
          </select>
          <small className="dms-form-help">เลือกประเภทการเยี่ยมหน้างาน</small>
        </label>
      </div>

      <PhotoField
        className="dms-form-field dms-form-field--full"
        label="ป้ายชื่ออาคาร"
        help="ถ่ายให้เห็นชื่ออาคารหรือโครงการชัดเจน"
        alt="sign"
        value={watch('signPhoto')}
        onFile={(e) => photos.handleFile(e, 'signPhoto')}
        onOpenCamera={() => openCamera('signPhoto')}
        onRemove={() => photos.removeSurveyPhoto('signPhoto')}
      />
    </section>
  )
}
