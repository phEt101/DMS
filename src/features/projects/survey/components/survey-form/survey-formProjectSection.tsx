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
  translations,
}: {
  form: UseFormReturn<Survey>
  photos: ReturnType<typeof usePhotos>
  openCamera: (target: string) => void
  translations?: any
}) {
  const { register, watch, setValue } = form
  const t = translations?.features?.survey ?? {}

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
      <h3>{t.form?.section?.projectInfo ?? 'Project information'}</h3>
      <label className="dms-form-field">
        <span className="dms-form-label">{t.form?.field?.surveyDate ?? 'Survey date'} <Required /></span>
        <input className="dms-form-input" type="date" {...register('surveyDate', { required: true })} />
        <small className="dms-form-help">{t.form?.help?.surveyDate ?? 'Select the date of survey'}</small>
      </label>
      <label className="dms-form-field">
        <span className="dms-form-label">{t.form?.field?.projectName ?? 'Project / Building'} <Required /></span>
        <input className="dms-form-input" placeholder={t.form?.placeholder?.projectName ?? 'e.g. Head Office'} {...register('projectName', { required: true })} />
        <small className="dms-form-help">{t.form?.help?.projectName ?? 'Project or building name'}</small>
      </label>
      <div className="dms-pm-create-grid">
        <label className="dms-form-field">
          <span className="dms-form-label">{t.form?.field?.floors ?? 'Floors'}</span>
          <input className="dms-form-input" type="number" placeholder={t.form?.placeholder?.floors ?? 'e.g. 5'} {...register('floors', { valueAsNumber: true })} />
          <small className="dms-form-help">{t.form?.help?.floors ?? 'Total number of floors'}</small>
        </label>
      </div>

      <div className="dms-pm-create-grid">
        <label className="dms-form-field">
          <span className="dms-form-label">{t.form?.field?.contactName ?? 'Contact (name)'} <Required /></span>
          <input className="dms-form-input" placeholder={t.form?.placeholder?.contactName ?? 'e.g. John Doe'} {...register('contact1.name', { required: true })} />
          <small className="dms-form-help">{t.form?.help?.contactName ?? 'On-site contact person'}</small>
        </label>
        <label className="dms-form-field">
          <span className="dms-form-label">{t.form?.field?.contactPhone ?? 'Contact (phone)'} <Required /></span>
          <input className="dms-form-input" placeholder={t.form?.placeholder?.contactPhone ?? 'e.g. 0812345678'} {...register('contact1.phone', { required: true })} />
          <small className="dms-form-help">{t.form?.help?.contactPhone ?? 'Reachable phone number'}</small>
        </label>
      </div>
      <div className="dms-pm-create-grid">
        <label className="dms-form-field">
          <span className="dms-form-label">{t.form?.field?.contactPosition ?? 'Position'} <Required /></span>
          <input className="dms-form-input" placeholder={t.form?.placeholder?.contactPosition ?? 'e.g. Site Supervisor'} {...register('contact1.position', { required: true })} />
          <small className="dms-form-help">{t.form?.help?.contactPosition ?? 'Position of contact person'}</small>
        </label>
        <label className="dms-form-field">
          <span className="dms-form-label">{t.form?.field?.visitTypeLabel ?? 'Visit type'}</span>
          <select className="dms-form-input" {...register('visitType')}>
            <option value="">{t.form?.option?.select ?? 'Select'}</option>
            <option value="survey_by_sale">{t.form?.option?.survey_by_sale ?? 'Survey by Sale'}</option>
            <option value="survey_by_sale_service">{t.form?.option?.survey_by_sale_service ?? 'Survey by Sale + Service'}</option>
          </select>
          <small className="dms-form-help">{t.form?.help?.visitType ?? 'Choose visit type'}</small>
        </label>
      </div>

      <PhotoField
        className="dms-form-field dms-form-field--full"
        label={t.form?.photo?.sign?.label ?? 'Signboard photo'}
        help={t.form?.photo?.sign?.help ?? 'Capture the building sign clearly'}
        alt="sign"
        translations={translations}
        value={watch('signPhoto')}
        onFile={(e) => photos.handleFile(e, 'signPhoto')}
        onRemove={() => photos.removeSurveyPhoto('signPhoto')}
      />
    </section>
  )
}
