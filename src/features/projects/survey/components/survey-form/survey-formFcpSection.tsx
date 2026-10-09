import type { UseFormReturn } from 'react-hook-form'
import type { Survey } from '../../types'
import PhotoField from './survey-formPhotoField'
import type { usePhotos } from './usePhotos'

export default function FcpSection({
  form,
  photos,
  openCamera,
  translations,
}: {
  form: UseFormReturn<Survey>
  photos: ReturnType<typeof usePhotos>
  openCamera: (target: string) => void
  translations?: any
}) {
  const { register, watch } = form
  const t = translations?.features?.survey ?? {}

  return (
    <section className="dms-pm-create-section">
      <h3>{t.form?.section?.fcp ?? 'Fire Alarm Control Panel (FCP)'}</h3>
      <div className="dms-pm-create-grid">
        <label className="dms-form-field">
          <span className="dms-form-label">{t.form?.field?.fcpBrand ?? 'FCP brand'}</span>
          <input className="dms-form-input" placeholder={t.form?.placeholder?.fcpBrand ?? 'e.g. Notifier'} {...register('fcpBrand')} />
          <small className="dms-form-help">{t.form?.help?.fcpBrand ?? 'Brand of the FCP cabinet'}</small>
        </label>
        <label className="dms-form-field">
          <span className="dms-form-label">{t.form?.field?.model ?? 'Model'}</span>
          <input className="dms-form-input" placeholder={t.form?.placeholder?.model ?? 'e.g. NFS2-3030'} {...register('fcpModel')} />
          <small className="dms-form-help">{t.form?.help?.fcpModel ?? 'Model or serial on the nameplate'}</small>
        </label>
      </div>
      <div className="dms-pm-create-grid">
        <label className="dms-form-field">
          <span className="dms-form-label">{t.form?.field?.fcpType ?? 'Type'}</span>
          <input className="dms-form-input" placeholder={t.form?.placeholder?.fcpType ?? 'e.g. Addressable'} {...register('fcpType')} />
          <small className="dms-form-help">{t.form?.help?.fcpType ?? 'Type of FCP system'}</small>
        </label>
        <label className="dms-form-field">
          <span className="dms-form-label">{t.form?.field?.fcpMaterial ?? 'Cabinet material'}</span>
          <input className="dms-form-input" placeholder={t.form?.placeholder?.fcpMaterial ?? 'e.g. Metal'} {...register('fcpMaterial')} />
          <small className="dms-form-help">{t.form?.help?.fcpMaterial ?? 'Material of the FCP cabinet (e.g., Metal, Plastic)'}</small>
        </label>
      </div>
      <label className="dms-form-field">
        <span className="dms-form-label">{t.form?.field?.fcpStatus ?? 'Status'}</span>
        <select className="dms-form-input" {...register('fcpStatus')}>
          <option value="">{t.form?.option?.select ?? 'Select'}</option>
          <option value="on">{t.form?.option?.on ?? 'On'}</option>
          <option value="off">{t.form?.option?.off ?? 'Off'}</option>
        </select>
        <small className="dms-form-help">{t.form?.help?.fcpStatus ?? 'On = powered, Off = powered off'}</small>
      </label>
      <div className="dms-pm-create-grid">
        <PhotoField
        label={t.form?.photo?.fcpOverview?.label ?? 'FCP overview photo'}
        help={t.form?.photo?.fcpOverview?.help ?? 'Capture the whole FCP cabinet'}
        alt="fcp"
        translations={translations}
        value={watch('fcpOverview')}
        onFile={(e) => photos.handleFile(e, 'fcpOverview')}
        onRemove={() => photos.removeSurveyPhoto('fcpOverview')}
        />
        <PhotoField
        label={t.form?.photo?.fcpNameplate?.label ?? 'Nameplate / Brand'}
        help={t.form?.photo?.fcpNameplate?.help ?? 'Capture brand and model clearly'}
        alt="fcp-nameplate"
        translations={translations}
        value={watch('fcpNameplate')}
        onFile={(e) => photos.handleFile(e, 'fcpNameplate')}
        onRemove={() => photos.removeSurveyPhoto('fcpNameplate')}
        />
        <PhotoField
        label={t.form?.photo?.fcpInside?.label ?? 'Inside cabinet'}
        help={t.form?.photo?.fcpInside?.help ?? 'Capture internal wiring and condition'}
        alt="fcp-inside"
        translations={translations}
        value={watch('fcpInside')}
        onFile={(e) => photos.handleFile(e, 'fcpInside')}
        onRemove={() => photos.removeSurveyPhoto('fcpInside')}
        />
      </div>
    </section>
  )
}
