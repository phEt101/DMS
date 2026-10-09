import type { UseFormReturn } from 'react-hook-form'
import type { Survey } from '../../types'
import PhotoField from './survey-formPhotoField'
import type { usePhotos } from './usePhotos'

export default function FcpSection({
  form,
  photos,
  openCamera,
}: {
  form: UseFormReturn<Survey>
  photos: ReturnType<typeof usePhotos>
  openCamera: (target: string) => void
}) {
  const { register, watch } = form

  return (
    <section className="dms-pm-create-section">
      <h3>Fire Alarm Control Panel (FCP)</h3>
      <div className="dms-pm-create-grid">
        <label className="dms-form-field">
          <span className="dms-form-label">ยี่ห้อ FCP</span>
          <input className="dms-form-input" placeholder="เช่น Notifier" {...register('fcpBrand')} />
          <small className="dms-form-help">ยี่ห้อของตู้ควบคุมระบบแจ้งเหตุเพลิงไหม้</small>
        </label>
        <label className="dms-form-field">
          <span className="dms-form-label">รุ่น</span>
          <input className="dms-form-input" placeholder="เช่น NFS2-3030" {...register('fcpModel')} />
          <small className="dms-form-help">รุ่นหรือหมายเลขบน Nameplate</small>
        </label>
      </div>
      <div className="dms-pm-create-grid">
        <label className="dms-form-field">
          <span className="dms-form-label">ประเภท</span>
          <input className="dms-form-input" placeholder="เช่น Addressable" {...register('fcpType')} />
          <small className="dms-form-help">ประเภทของระบบ FCP</small>
        </label>
        <label className="dms-form-field">
          <span className="dms-form-label">วัสดุตู้</span>
          <input className="dms-form-input" placeholder="เช่น Metal" {...register('fcpMaterial')} />
          <small className="dms-form-help">วัสดุของตู้ FCP (เช่น Metal, Plastic)</small>
        </label>
      </div>
      <label className="dms-form-field">
        <span className="dms-form-label">Status</span>
        <select className="dms-form-input" {...register('fcpStatus')}>
          <option value="">เลือก</option>
          <option value="on">On</option>
          <option value="off">Off</option>
        </select>
        <small className="dms-form-help">On = เปิดใช้งาน, Off = ปิดอยู่</small>
      </label>
      <div className="dms-pm-create-grid">
        <PhotoField
          label="FCP overview photo"
          help="ถ่ายให้เห็นตู้ FCP ทั้งตู้"
          alt="fcp"
          value={watch('fcpOverview')}
          onFile={(e) => photos.handleFile(e, 'fcpOverview')}
          onOpenCamera={() => openCamera('fcpOverview')}
          onRemove={() => photos.removeSurveyPhoto('fcpOverview')}
        />
        <PhotoField
          label="ป้ายชื่อ / แผงยี่ห้อ"
          help="ถ่ายให้เห็น Brand และ Model ชัดเจน"
          alt="fcp-nameplate"
          value={watch('fcpNameplate')}
          onFile={(e) => photos.handleFile(e, 'fcpNameplate')}
          onOpenCamera={() => openCamera('fcpNameplate')}
          onRemove={() => photos.removeSurveyPhoto('fcpNameplate')}
        />
        <PhotoField
          label="ภายในตู้ / สายไฟ"
          help="ถ่ายให้เห็นสภาพภายในตู้และการเดินสาย"
          alt="fcp-inside"
          value={watch('fcpInside')}
          onFile={(e) => photos.handleFile(e, 'fcpInside')}
          onOpenCamera={() => openCamera('fcpInside')}
          onRemove={() => photos.removeSurveyPhoto('fcpInside')}
        />
      </div>
    </section>
  )
}
