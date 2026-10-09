import { useState } from 'react'
import type { Survey } from '../../types'
import { createSurvey, updateSurvey } from '../../../../../services/surveys.api'
import { buildBodyPayload, buildFormData } from './buildPayload'

export function useSurveySave({
  filesMap,
  onSaved,
  onClose,
}: {
  filesMap: Record<string, File | null>
  onSaved: (s: Survey) => void
  onClose: () => void
}) {
  const [saving, setSaving] = useState(false)

  const onSave = async (values: Survey, submit = false) => {
    try {
      setSaving(true)
      const payload = { ...values, updatedAt: new Date().toISOString(), status: submit ? 'submitted' : 'draft' } as any

      const bodyPayload = buildBodyPayload(payload)
      const { form, hasFiles } = buildFormData(bodyPayload, filesMap)
      const body = hasFiles ? form : bodyPayload

      // Log outgoing payload for debugging server 500
      try {
        if (hasFiles) {
          // cannot stringify FormData directly; list keys for inspection
          const keys: string[] = []
          for (const k of (form as FormData).keys()) keys.push(String(k))
          console.debug('Saving survey (multipart) - payload keys:', keys)
        } else {
          console.debug('Saving survey (json) - payload:', body)
        }
      } catch (err) {
        console.warn('Failed to log payload', err)
      }

      // determine create vs update
      const isUpdate = (typeof payload.id === 'string' && /^\d+$/.test(payload.id)) || typeof payload.id === 'number'

      try {
        let res: any

        // Submit behaves like Save draft (full payload incl. edits/files); only the status differs
        res = isUpdate ? await updateSurvey(payload.id as any, body) : await createSurvey(body)

        // backend returns created/updated object
        onSaved({
          ...values,
          id: String(res.id),
          createdAt: res.createdAt ?? values.createdAt,
          updatedAt: res.updatedAt ?? new Date().toISOString(),
          status: res.status ?? values.status,
          location: res.location ?? values.location,
          equipment: res.equipment
            ? res.equipment.map((e: any) => ({ name: e.customName ?? '', status: e.isPresent ? 'yes' : 'no', model: e.model, qty: e.qty, photo: e.photo }))
            : values.equipment,
        })
        onClose()
      } catch (err: any) {
        // surface server error to user and keep form open for correction
        console.error('save survey failed', err)
        // Show full error body when available for debugging (stringify if object)
        const body = err?.body
        let bodyStr: string | undefined
        try {
          if (body && typeof body === 'object') bodyStr = JSON.stringify(body, null, 2)
          else if (typeof body === 'string') bodyStr = body
        } catch (e) {
          bodyStr = String(body)
        }
        const serverMsg = bodyStr ?? err?.message ?? String(err)
        // use alert for simplicity; replace with app toast if available
        alert(`Save failed: ${serverMsg}`)
        return
      }
    } finally {
      setSaving(false)
    }
  }

  return { saving, onSave }
}
