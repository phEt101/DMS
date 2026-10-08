import { useEffect, useRef, useState } from 'react'
import type L from 'leaflet'
import type { UseFormReturn } from 'react-hook-form'
import type { Survey } from '../../types'
import { parseThaiAddress, reverseGeocode, searchPlaces } from './geocode'
import type { PostalApi } from './usePostalCodes'

export function useLocationPicker({
  initial,
  getValues,
  updateLocation,
  postal,
}: {
  initial?: Survey | null
  getValues: UseFormReturn<Survey>['getValues']
  updateLocation: (patch: Record<string, any>) => void
  postal: Pick<PostalApi, 'loadDistrictsFor' | 'loadSubdistrictsFor' | 'loadPostalCodeFor'>
}) {
  const initialCenter: [number, number] = initial?.location
    ? [initial.location.latitude ?? 13.736717, initial.location.longitude ?? 100.523186]
    : [13.736717, 100.523186]
  const initialZoom = initial?.location ? 15 : 6

  const [tempPos, setTempPos] = useState<{ lat: number; lng: number } | null>(
    initial?.location && typeof initial.location.latitude === 'number' && typeof initial.location.longitude === 'number'
      ? { lat: initial.location.latitude as number, lng: initial.location.longitude as number }
      : null
  )
  const [searchQuery, setSearchQuery] = useState('')
  const mapRef = useRef<L.Map | null>(null)
  const skipSearchRef = useRef(false) // กันไม่ให้ค้นหาซ้ำตอนเลือกผลลัพธ์แล้วเติมชื่อลงช่อง
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)

  const doSearch = async (q: string) => {
    setSearchError(null)
    setSearchResults([])
    const t = q.trim()
    if (!t || t.length <= 2) {
      setSearchLoading(false)
      return
    }
    setSearchLoading(true)
    try {
      const json = await searchPlaces(t)
      setSearchResults(Array.isArray(json) ? json : [])
      if (!Array.isArray(json) || json.length === 0) setSearchError('ไม่พบผลการค้นหา')
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : String(err))
    } finally {
      setSearchLoading(false)
    }
  }

  // Debounce searchQuery changes: 500ms
  useEffect(() => {
    if (skipSearchRef.current) { skipSearchRef.current = false; return }
    if (!searchQuery || searchQuery.trim().length <= 2) {
      setSearchResults([])
      setSearchError(null)
      setSearchLoading(false)
      return
    }
    setSearchLoading(true)
    const id = setTimeout(() => void doSearch(searchQuery), 500)
    return () => clearTimeout(id)
  }, [searchQuery])

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setSearchError(null)
  }

  // เลือกผลการค้นหา -> วางหมุด + ซูมเข้าไปที่ตำแหน่ง
  const selectSearchResult = (r: any) => {
    const lat = Number(r.lat); const lng = Number(r.lon)
    setTempPos({ lat, lng })
    mapRef.current?.flyTo([lat, lng], 18, { duration: 1 })
    setSearchResults([])
    setSearchError(null)
    skipSearchRef.current = true
    setSearchQuery(r.name || String(r.display_name).split(',')[0])
  }

  // ปุ่มไอคอนตำแหน่งปัจจุบัน -> วางหมุด + ซูมไปที่ตำแหน่งที่อยู่
  const locateMe = () => {
    setGeoError(null)
    if (!('geolocation' in navigator)) { setGeoError('เบราว์เซอร์ไม่รองรับการหาตำแหน่ง'); return }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude; const lng = pos.coords.longitude
      setTempPos({ lat, lng })
      mapRef.current?.flyTo([lat, lng], 18, { duration: 0.9 })
      setGeoLoading(false)
    }, (err) => {
      let msg = 'ไม่สามารถเข้าถึงตำแหน่งปัจจุบันได้'
      if (err.code === 1) msg = 'การขอสิทธิ์ตำแหน่งถูกปฏิเสธ'
      else if (err.code === 2) msg = 'ไม่สามารถระบุตำแหน่งได้'
      else if (err.code === 3) msg = 'การขอตำแหน่งหมดเวลา'
      setGeoError(msg)
      setGeoLoading(false)
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 })
  }

  // ปุ่ม "เลือกตำแหน่งนี้": reverse geocode แล้วเติมที่อยู่/จังหวัด/อำเภอ/ตำบล ให้ตรงกับตัวเลือกใน DB
  const confirmLocation = async () => {
    if (!tempPos) return
    const rev = await reverseGeocode(tempPos.lat, tempPos.lng)
    const geo = parseThaiAddress(rev)
    const prev = (getValues('location') ?? {}) as any

    // Preserve existing location where possible; set latitude/longitude/address/country and province
    // (do not clear province when missing)
    const provinceVal: string = geo.province || prev.province || ''
    updateLocation({
      latitude: Number(tempPos.lat),
      longitude: Number(tempPos.lng),
      address: geo.address,
      country: geo.country,
      province: provinceVal,
    })

    // Load districts for this province so user can select if reverse geocode lacked district
    const districtsList = provinceVal ? await postal.loadDistrictsFor(provinceVal) : []
    const geoDistrict = geo.district || ''
    const prevDistrict: string = prev.district || ''

    if (geoDistrict && districtsList.includes(geoDistrict)) {
      // geocoded district matches DB options, set it and proceed
      updateLocation({ district: geoDistrict })
      const subList = await postal.loadSubdistrictsFor(provinceVal, geoDistrict)
      const geoSub = geo.subdistrict || ''
      if (geoSub && subList.includes(geoSub)) {
        updateLocation({ district: geoDistrict, subdistrict: geoSub, postalCode: geo.postcode || '' })
        // if postal code missing, fetch from DB
        if (!geo.postcode) await postal.loadPostalCodeFor(provinceVal, geoDistrict, geoSub)
      } else {
        // geocoded subdistrict absent or not matching DB — keep district selected, let user select subdistrict
        updateLocation({ district: geoDistrict, subdistrict: prev.subdistrict || '', postalCode: prev.postalCode || '' })
      }
    } else if (prevDistrict && districtsList.includes(prevDistrict)) {
      // geocoded district missing / not in DB — keep previous district if it is valid for this province
      updateLocation({ district: prevDistrict })
      const subList = await postal.loadSubdistrictsFor(provinceVal, prevDistrict)
      const prevSub: string = prev.subdistrict || ''
      if (prevSub && subList.includes(prevSub)) {
        updateLocation({ district: prevDistrict, subdistrict: prevSub })
        if (!prev.postalCode) await postal.loadPostalCodeFor(provinceVal, prevDistrict, prevSub)
      } else {
        updateLocation({ district: prevDistrict, subdistrict: '', postalCode: '' })
      }
    } else {
      // clear lower levels but keep province
      updateLocation({ district: '', subdistrict: '', postalCode: '' })
    }
  }

  const showDropdown = searchLoading || searchResults.length > 0 || !!searchError || !!geoError

  return {
    initialCenter, initialZoom,
    tempPos, setTempPos,
    searchQuery, setSearchQuery, clearSearch, doSearch,
    mapRef,
    searchLoading, searchResults, searchError,
    geoError, geoLoading,
    showDropdown,
    selectSearchResult, locateMe, confirmLocation,
  }
}

export type LocationPicker = ReturnType<typeof useLocationPicker>
