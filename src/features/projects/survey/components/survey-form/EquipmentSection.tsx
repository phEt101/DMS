import type { UseFormReturn } from 'react-hook-form'
import type { Survey } from '../../types'
import PhotoField from './PhotoField'
import type { usePhotos } from './usePhotos'
import { cleanEquipment } from './utils'

export default function EquipmentSection({
  form,
  photos,
  openCamera,
  isEditing = false,
}: {
  form: UseFormReturn<Survey>
  photos: ReturnType<typeof usePhotos>
  openCamera: (target: string) => void
  isEditing?: boolean
}) {
  const { register, watch, setValue } = form
  const equipment = (watch('equipment') || []) as any[]

  const removeItem = (idx: number) => {
    const arr = [...((watch('equipment') || []) as any[])]
    arr.splice(idx, 1)
    setValue('equipment', cleanEquipment(arr))
  }

  // add a blank-name custom item so the UI shows an editable input immediately;
  // mark isCustom so it remains editable after typing
  const addCustomItem = () => {
    const prevArr = (watch('equipment') || []) as any[]
    const arr = [...prevArr, { name: '', status: 'yes', model: '', qty: undefined, photo: null, isCustom: true }]
    setValue('equipment', cleanEquipment(arr))
  }

  return (
    <section className="dms-pm-create-section">
      <h3>Equipment Checklist</h3>
      {equipment.map((item, idx) => {
        const isCustom = !!(item as any).isCustom || !item.name || item.name === 'อื่นๆ'
        return (
          <div key={idx} className="dms-pm-create-grid" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isCustom ? (
                <div style={{ flex: 1 }}>
                  <label className="dms-form-field" style={{ margin: 0 }}>
                    <span className="dms-form-label">อื่นๆ</span>
                    <input className="dms-form-input" placeholder="ระบุอุปกรณ์" {...register(`equipment.${idx}.name` as const)} />
                  </label>
                </div>
              ) : (
                <label className="dms-form-label" style={{ margin: 0 }}>{item.name}</label>
              )}
              {isCustom || isEditing ? (
                <button type="button" className="dms-back-btn" onClick={() => removeItem(idx)}>ลบ</button>
              ) : null}
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <label className="dms-form-field" style={{ margin: 0 }}>
                  <input type="radio" {...register(`equipment.${idx}.status` as const)} value="no" defaultChecked={item.status === 'no'} /> ไม่มี
                </label>
                <label className="dms-form-field" style={{ margin: 0 }}>
                  <input type="radio" {...register(`equipment.${idx}.status` as const)} value="yes" defaultChecked={item.status === 'yes'} /> มี
                </label>
              </div>
              {equipment[idx]?.status === 'yes' && (
                <div>
                  <label className="dms-form-field">
                    <span className="dms-form-label">Model</span>
                    <input className="dms-form-input" placeholder="เช่น GA-200" {...register(`equipment.${idx}.model` as const)} />
                    <small className="dms-form-help">หมายเลขรุ่นของอุปกรณ์ (ถ้ามี)</small>
                  </label>
                  <label className="dms-form-field">
                    <span className="dms-form-label">Quantity</span>
                    <input className="dms-form-input" type="number" placeholder="เช่น 4" {...register(`equipment.${idx}.qty` as const, { valueAsNumber: true })} />
                    <small className="dms-form-help">จำนวนชิ้นของอุปกรณ์</small>
                  </label>
                  <PhotoField
                    label="Photo"
                    alt="equip"
                    value={equipment[idx]?.photo}
                    onFile={(e) => photos.handleEquipmentFile(e, idx)}
                    onOpenCamera={() => openCamera(`equip-${idx}`)}
                    onRemove={() => photos.removeEquipmentPhoto(idx)}
                  />
                </div>
              )}
            </div>
          </div>
        )
      })}
      <div style={{ marginTop: 8 }}>
        <button type="button" className="dms-create-btn" onClick={addCustomItem}>เพิ่ม อื่นๆ</button>
      </div>
    </section>
  )
}