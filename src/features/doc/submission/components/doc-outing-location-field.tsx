import { useRef, useState } from 'react'
import type { FormValues } from '../../document-types'
import type { Survey } from '../../../projects/survey/types'
import LocationSection from '../../../projects/survey/components/form/survey-formLocationSection'
import { useLocationPicker } from '../../../projects/survey/components/form/useLocationPicker'
import { usePostalCodes } from '../../../projects/survey/components/form/usePostalCodes'

type Location = NonNullable<Survey['location']>
type Props = {
  values: FormValues
  onChange: (key: string, value: string | boolean) => void
  translations: any
}

export default function DocOutingLocationField({ values, onChange, translations }: Props) {
  const [location, setLocation] = useState<Location>(() => ({
    address: String(values.address ?? ''),
    province: String(values.province ?? ''),
    district: String(values.district ?? ''),
    subdistrict: String(values.subdistrict ?? ''),
    postalCode: String(values.postalCode ?? ''),
    country: String(values.country ?? ''),
    ...(values.latitude ? { latitude: Number(values.latitude) } : {}),
    ...(values.longitude ? { longitude: Number(values.longitude) } : {}),
  }))
  const locationRef = useRef(location)
  const hasInitialLocation = Boolean(
    location.address || location.province || location.latitude || location.longitude,
  )
  const updateLocation = (patch: Partial<Location>) => {
    const next = { ...locationRef.current, ...patch }
    locationRef.current = next
    setLocation(next)
    Object.entries(patch).forEach(([key, value]) => {
      onChange(key, typeof value === 'number' ? String(value) : value ?? '')
    })
  }
  const getLocation = () => locationRef.current
  const postal = usePostalCodes({
    initialLocation: hasInitialLocation ? location : null,
    getLocation,
    updateLocation,
  })
  const picker = useLocationPicker({
    initialLocation: hasInitialLocation ? location : null,
    getLocation,
    updateLocation,
    postal,
  })

  return <LocationSection
    locationValue={location}
    updateLocation={updateLocation}
    picker={picker}
    postal={postal}
    translations={translations}
    sectionTitle={translations.features.documentManagement.fieldLabels.outingLocation}
    mapHeight={260}
    className="outing-location-section"
  />
}
