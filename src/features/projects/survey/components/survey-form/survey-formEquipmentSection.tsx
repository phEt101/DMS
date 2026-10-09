import type { UseFormReturn } from 'react-hook-form'
import type { Survey } from '../../types'
import PhotoField from './survey-formPhotoField'
import type { usePhotos } from './usePhotos'
import { cleanEquipment } from './utils'

export default function EquipmentSection({
  form,
  photos,
  openCamera,
  isEditing = false,
  translations,
}: {
  form: UseFormReturn<Survey>
  photos: ReturnType<typeof usePhotos>
  openCamera: (target: string) => void
  isEditing?: boolean
  translations?: any
}) {
  const t = translations?.features?.survey ?? {}
  const { register, watch, setValue } = form
  const equipment = (watch('equipment') || []) as any[]

  const removeItem = (idx: number) => {
    const prevArr = [...((watch('equipment') || []) as any[])]
    const arr = [...prevArr]
    arr.splice(idx, 1)
    setValue('equipment', cleanEquipment(arr))
    // update filesMap to remove the removed equipment file and shift subsequent keys
    photos && (photos as any).setFilesMap?.((m: Record<string, File | null>) => {
      const copy = { ...m }
      // remove all equip- keys first
      for (const k of Object.keys(copy)) {
        if (k.startsWith('equip-')) delete copy[k]
      }
      // reassign files for remaining equipment based on previous indices
      for (let i = 0; i < arr.length; i++) {
        const sourceIndex = i < idx ? i : i + 1
        const oldKey = `equip-${sourceIndex}`
        if (m[oldKey]) copy[`equip-${i}`] = m[oldKey]
      }
      return copy
    })
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
      <h3>{t.form?.section?.equipment ?? 'Equipment Checklist'}</h3>
      {equipment.map((item, idx) => {
        const isCustom = !!(item as any).isCustom || !item.name || item.name === 'อื่นๆ'
        return (
          <div key={idx} className="dms-pm-create-grid" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isCustom ? (
                <div style={{ flex: 1 }}>
                  <label className="dms-form-field" style={{ margin: 0 }}>
                <span className="dms-form-label">{t.form?.option?.other ?? 'Other'}</span>
                <input className="dms-form-input" placeholder={t.form?.placeholder?.equipment ?? 'Specify equipment'} {...register(`equipment.${idx}.name` as const)} />
                  </label>
                </div>
              ) : (
                <label className="dms-form-label" style={{ margin: 0 }}>{item.name}</label>
              )}
              {isCustom || isEditing ? (
                <button type="button" className="dms-back-btn" onClick={() => removeItem(idx)}>{t.form?.actions?.remove ?? 'Remove'}</button>
              ) : null}
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <label className="dms-form-field" style={{ margin: 0 }}>
                  <input type="radio" {...register(`equipment.${idx}.status` as const)} value="no" defaultChecked={item.status === 'no'} /> {t.form?.option?.off ?? 'No'}
                </label>
                <label className="dms-form-field" style={{ margin: 0 }}>
                  <input type="radio" {...register(`equipment.${idx}.status` as const)} value="yes" defaultChecked={item.status === 'yes'} /> {t.form?.option?.on ?? 'Yes'}
                </label>
              </div>
              {equipment[idx]?.status === 'yes' && (
                <div>
                  <label className="dms-form-field">
                    <span className="dms-form-label">{t.form?.field?.model ?? 'Model'}</span>
                    <input className="dms-form-input" placeholder={t.form?.placeholder?.model ?? 'e.g. GA-200'} {...register(`equipment.${idx}.model` as const)} />
                    <small className="dms-form-help">{t.form?.help?.model ?? 'Model number of the equipment (if any)'}</small>
                  </label>
                  <label className="dms-form-field">
                    <span className="dms-form-label">{t.form?.field?.qty ?? 'Quantity'}</span>
                    <input className="dms-form-input" type="number" placeholder={t.form?.placeholder?.qty ?? 'e.g. 4'} {...register(`equipment.${idx}.qty` as const, { valueAsNumber: true })} />
                    <small className="dms-form-help">{t.form?.help?.qty ?? 'Number of pieces'}</small>
                  </label>
                  <PhotoField
                  label={t.form?.photo?.equipment?.label ?? 'Photo'}
                  alt="equip"
                  translations={translations}
                  value={equipment[idx]?.photo}
                  onFile={(e) => photos.handleEquipmentFile(e, idx)}
                  onRemove={() => photos.removeEquipmentPhoto(idx)}
                  />
                </div>
              )}
            </div>
          </div>
        )
      })}
      <div style={{ marginTop: 8 }}>
        <button type="button" className="dms-create-btn" onClick={addCustomItem}>{t.form?.actions?.addCustomEquipment ?? 'Add other'}</button>
      </div>
    </section>
  )
}