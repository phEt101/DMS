import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import type { Survey } from '../../types'
import CameraOverlay from './survey-cameraoverlay'
import ActionBar from './survey-formActionBar'
import ProjectSection from './survey-formProjectSection'
import LocationSection from './survey-formLocationSection'
import FcpSection from './survey-formFcpSection'
import EquipmentSection from './survey-formEquipmentSection'
import NotesSection from './survey-formNotesSection'
import { useCamera } from './useCamera'
import { usePhotos } from './usePhotos'
import { usePostalCodes } from './usePostalCodes'
import { useLocationPicker } from './useLocationPicker'
import { useSurveySave } from './useSurveySave'
import { getDefaultValues } from './utils'

export default function SurveyForm({
  initial,
  onSaved,
  onClose,
}: {
  initial?: Survey | null
  onSaved: (s: Survey) => void
  onClose: () => void
}) {
  const form = useForm<Survey>({ defaultValues: getDefaultValues(initial) })
  const { handleSubmit, setValue, getValues, watch, register } = form

  const locationValue = watch('location')

  // merge ค่า location ปัจจุบันกับ patch ที่ส่งเข้ามา
  const updateLocation = (patch: Record<string, any>) =>
    setValue('location', { ...(getValues('location') ?? {}), ...patch } as any)

  // ผูกฟิลด์รูปกับฟอร์ม เพื่อให้ค่ารูปเดิม (จากโหมดแก้ไข) ถูกเก็บและแสดงผลได้แน่นอน
  useEffect(() => {
    ;(['signPhoto', 'fcpOverview', 'fcpNameplate', 'fcpInside'] as const).forEach((k) => register(k))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const photos = usePhotos(form)
  const camera = useCamera(form)
  const postal = usePostalCodes({ initialLocation: initial?.location, getValues, updateLocation })
  const picker = useLocationPicker({ initial, getValues, updateLocation, postal })
  const { saving, onSave } = useSurveySave({ filesMap: photos.filesMap, onSaved, onClose })

  return (
    <>
      <form className="survey-form" onSubmit={handleSubmit((v) => onSave(v, true))}>
        <ActionBar saving={saving} onSaveDraft={() => { handleSubmit((v) => onSave(v, false))() }} />

        <ProjectSection form={form} photos={photos} openCamera={camera.openCamera} />
        <LocationSection locationValue={locationValue} updateLocation={updateLocation} picker={picker} postal={postal} />
        <FcpSection form={form} photos={photos} openCamera={camera.openCamera} />
        <EquipmentSection form={form} photos={photos} openCamera={camera.openCamera} isEditing={!!initial} />
        <NotesSection form={form} />
      </form>

      <CameraOverlay
        cameraOpenFor={camera.cameraOpenFor}
        capturedTemp={camera.capturedTemp}
        videoRef={camera.videoRef}
        onCapture={camera.captureFromCamera}
        onConfirm={camera.confirmCaptured}
        onRetake={camera.retake}
        onClose={camera.closeCamera}
      />
    </>
  )
}