import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { Survey } from '../../types'
import { cleanEquipment, toBase64 } from './utils'

type FormApi = Pick<UseFormReturn<Survey>, 'watch' | 'setValue'>

export function usePhotos({ watch, setValue }: FormApi) {
  // keep File objects to upload via multipart but keep base64 previews for UI
  const [filesMap, setFilesMap] = useState<Record<string, File | null>>({})

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, key: keyof Survey) => {
    const file = e.target.files?.[0]
    if (!file) return
    const b64 = await toBase64(file)
    setValue(String(key) as any, b64)
    setFilesMap((m) => ({ ...m, [String(key)]: file }))
  }

  const handleEquipmentFile = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const f = e.target.files?.[0]
    if (!f) return
    const b = await toBase64(f)
    const arr = [...((watch('equipment') || []) as any[])]
    arr[idx] = { ...arr[idx], photo: b }
    setValue('equipment', cleanEquipment(arr))
    setFilesMap((m) => ({ ...m, [`equip-${idx}`]: f }))
  }

  const removeSurveyPhoto = (key: keyof Survey) => {
    setValue(String(key) as any, null)
    // also remove pending File object so buildFormData won't include it
    setFilesMap((m) => {
      const copy = { ...m }
      delete copy[String(key)]
      return copy
    })
  }

  const removeEquipmentPhoto = (idx: number) => {
    const arr = [...((watch('equipment') || []) as any[])]
    arr[idx] = { ...arr[idx], photo: null }
    setValue('equipment', cleanEquipment(arr))
    // remove any queued file for this equipment index
    setFilesMap((m) => {
      const copy = { ...m }
      delete copy[`equip-${idx}`]
      return copy
    })
  }

  return { filesMap, setFilesMap, handleFile, handleEquipmentFile, removeSurveyPhoto, removeEquipmentPhoto }
}
