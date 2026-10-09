import { useEffect } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'
import type L from 'leaflet'

export default function MapEvents({
  mapRef,
  onPick,
}: {
  mapRef: React.MutableRefObject<L.Map | null>
  onPick: (lat: number, lng: number) => void
}) {
  const map = useMap()
  useEffect(() => {
    mapRef.current = map
    return () => { mapRef.current = null }
  }, [map, mapRef])
  useMapEvents({
    click(e) {
      const { lat, lng } = (e as any).latlng
      onPick(lat, lng)
      map.flyTo([lat, lng], 18, { duration: 0.9 })
    },
  })
  return null
}
