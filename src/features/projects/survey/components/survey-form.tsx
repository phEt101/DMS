import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useForm } from 'react-hook-form'
import type { Survey, EquipmentItem } from '../types'
import { saveSurvey } from '../storage'

function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader()
    fr.onload = () => res(String(fr.result))
    fr.onerror = rej
    fr.readAsDataURL(file)
  })
}

// Leaflet default icon (ประกาศนอก component เพื่อไม่ให้สร้างใหม่ทุกครั้งที่ render)
const DefaultIcon = L.icon({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

// เก็บ map instance ลง ref และจัดการการคลิกบนแผนที่
function MapEvents({
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
      const { lat, lng } = e.latlng
      onPick(lat, lng)
      map.flyTo([lat, lng], 18, { duration: 0.9 })
    },
  })
  return null
}

export default function SurveyForm({ initial, onSaved, onClose }: { initial?: Survey | null; onSaved: (s: Survey) => void; onClose: () => void }) {
  const now = new Date().toISOString().slice(0, 10)
  const { register, handleSubmit, setValue, watch } = useForm<Survey>({ defaultValues: initial ?? {
    id: `survey-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'draft',
    surveyDate: now,
    projectName: '',
    province: '',
    floors: undefined,
    contact1: { name: '', position: '', phone: '' },
    contact2: { name: '', position: '', phone: '' },
    visitType: '',
    signPhoto: null,
    fcpBrand: '',
    fcpModel: '',
    fcpType: '',
    fcpMaterial: '',
    fcpStatus: '',
    fcpOverview: null,
    fcpNameplate: null,
    fcpInside: null,
    equipment: [
      { name: 'Graphic Annunciator', status: 'no' },
      { name: 'Smoke Detector', status: 'no' },
      { name: 'Heat Detector', status: 'no' },
      { name: 'Manual Detector', status: 'no' },
      { name: 'Alarm Bell', status: 'no' },
      { name: 'Computer', status: 'no' },
      { name: 'Module Box', status: 'no' },
    ] as EquipmentItem[],
    notes: ''
  }})

  const [saving, setSaving] = useState(false)

  const onSave = async (values: Survey, submit = false) => {
    try {
      setSaving(true)
      const next: Survey = { ...values, updatedAt: new Date().toISOString(), status: submit ? 'submitted' : 'draft' }
      saveSurvey(next)
      onSaved(next)
      onClose()
    } finally { setSaving(false) }
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, key: keyof Survey) => {
    const file = e.target.files?.[0]
    if (!file) return
    const b64 = await toBase64(file)
    setValue(String(key) as any, b64)
  }

  const handleEquipmentFile = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const f = e.target.files?.[0]
    if (!f) return
    const b = await toBase64(f)
    const prev = watch('equipment') || []
    const arr = [...prev]
    arr[idx] = { ...arr[idx], photo: b }
    const clean = arr.map((it: any) => ({ ...it, qty: Number.isFinite(Number(it.qty)) ? Number(it.qty) : undefined }))
    setValue('equipment', clean)
  }

  const removeSurveyPhoto = (key: keyof Survey) => {
    setValue(String(key) as any, null)
  }

  const removeEquipmentPhoto = (idx: number) => {
    const prev = watch('equipment') || []
    const arr = [...prev]
    arr[idx] = { ...arr[idx], photo: null }
    const clean = arr.map((it: any) => ({ ...it, qty: Number.isFinite(Number(it.qty)) ? Number(it.qty) : undefined }))
    setValue('equipment', clean)
  }

  // Camera capture state
  const [cameraOpenFor, setCameraOpenFor] = useState<string | null>(null) // e.g. 'signPhoto' or 'fcpOverview' or 'equip-0'
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [capturedTemp, setCapturedTemp] = useState<string | null>(null)

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      try { videoRef.current.srcObject = null } catch {}
    }
  }

  const openCamera = async (target: string) => {
    setCapturedTemp(null)
    setCameraOpenFor(target)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: 'environment' } } })
      streamRef.current = stream
    } catch (err) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        streamRef.current = stream
      } catch (err2) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true })
          streamRef.current = stream
        } catch (err3) {
          setCameraOpenFor(null)
          streamRef.current = null
          return
        }
      }
    }
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      try { videoRef.current.play() } catch {}
    }
  }

  const closeCamera = () => {
    stopStream()
    setCapturedTemp(null)
    setCameraOpenFor(null)
  }

  const captureFromCamera = () => {
    const video = videoRef.current
    if (!video) return
    const w = video.videoWidth || 1280
    const h = video.videoHeight || 720
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, w, h)
    const data = canvas.toDataURL('image/jpeg', 0.9)
    setCapturedTemp(data)
  }

  const confirmCaptured = () => {
    if (!cameraOpenFor || !capturedTemp) return
    if (cameraOpenFor.startsWith('equip-')) {
      const idx = Number(cameraOpenFor.split('-')[1])
      const arr = watch('equipment') || []
      arr[idx] = { ...arr[idx], photo: capturedTemp }
      setValue('equipment', arr)
    } else {
      setValue(cameraOpenFor as any, capturedTemp)
    }
    closeCamera()
  }

  const equipment = watch('equipment')
  const locationValue = watch('location')

  // Location picker state
  const initialCenter: [number, number] = initial?.location
    ? [initial.location.latitude, initial.location.longitude]
    : [13.736717, 100.523186]
  const initialZoom = initial?.location ? 15 : 6
  const [tempPos, setTempPos] = useState<{ lat: number; lng: number } | null>(
    initial?.location ? { lat: initial.location.latitude, lng: initial.location.longitude } : null
  )
  const [searchQuery, setSearchQuery] = useState('')
  const mapRef = useRef<L.Map | null>(null)
  const skipSearchRef = useRef(false) // กันไม่ให้ค้นหาซ้ำตอนเลือกผลลัพธ์แล้วเติมชื่อลงช่อง
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [lastSearched, setLastSearched] = useState<string>('')

  // Location lists from backend (seeded postal_codes)
  const [provinces, setProvinces] = useState<string[] | null>(null)
  const [districts, setDistricts] = useState<string[] | null>(null)
  const [subdistricts, setSubdistricts] = useState<string[] | null>(null)

  // helper functions to load cascaded lists using central request helper
  const loadDistrictsFor = async (prov: string) => {
    try {
      const { request } = await import('../../../../services/api')
      const json = await request(`/postal-codes/districts?province=${encodeURIComponent(prov)}`)
      console.debug('[survey] districts loaded for', prov, json)
      const list = Array.isArray(json) ? json : []
      setDistricts(list)
      return list
    } catch (err) {
      console.error('[survey] loadDistrictsFor failed', err)
      const apiPrefix = import.meta.env.VITE_API_URL ?? '/boswell-api/v1'
      try {
        const res = await fetch(`${apiPrefix}/postal-codes/districts?province=${encodeURIComponent(prov)}`, { credentials: 'include' })
        if (!res.ok) throw new Error(`status:${res.status}`)
        const json = await res.json()
        const list = Array.isArray(json) ? json : []
        setDistricts(list)
        return list
      } catch (e) {
        console.error('[survey] fallback loadDistrictsFor failed', e)
        setDistricts([])
        return []
      }
    }
  }

  const loadSubdistrictsFor = async (prov: string, dist: string) => {
    try {
      const { request } = await import('../../../../services/api')
      const json = await request(`/postal-codes/subdistricts?province=${encodeURIComponent(prov)}&district=${encodeURIComponent(dist)}`)
      console.debug('[survey] subdistricts loaded for', prov, dist, json)
      const list = Array.isArray(json) ? json : []
      setSubdistricts(list)
      return list
    } catch (err) {
      console.error('[survey] loadSubdistrictsFor failed', err)
      const apiPrefix = import.meta.env.VITE_API_URL ?? '/boswell-api/v1'
      try {
        const res = await fetch(`${apiPrefix}/postal-codes/subdistricts?province=${encodeURIComponent(prov)}&district=${encodeURIComponent(dist)}`, { credentials: 'include' })
        if (!res.ok) throw new Error(`status:${res.status}`)
        const json = await res.json()
        const list = Array.isArray(json) ? json : []
        setSubdistricts(list)
        return list
      } catch (e) {
        console.error('[survey] fallback loadSubdistrictsFor failed', e)
        setSubdistricts([])
        return []
      }
    }
  }

  const loadPostalCodeFor = async (prov: string, dist: string, sub: string) => {
    try {
      const { request } = await import('../../../../services/api')
      const json = await request(`/postal-codes/postal-code?province=${encodeURIComponent(prov)}&district=${encodeURIComponent(dist)}&subdistrict=${encodeURIComponent(sub)}`)
      console.debug('[survey] postal-code loaded for', prov, dist, sub, json)
      if (json && json.postalCode) {
        setValue('location', { ...(locationValue ?? {}), postalCode: json.postalCode, subdistrict: sub } as any)
      }
    } catch (err) {
      console.error('[survey] loadPostalCodeFor failed', err)
      const apiPrefix = import.meta.env.VITE_API_URL ?? '/boswell-api/v1'
      try {
        const res = await fetch(`${apiPrefix}/postal-codes/postal-code?province=${encodeURIComponent(prov)}&district=${encodeURIComponent(dist)}&subdistrict=${encodeURIComponent(sub)}`, { credentials: 'include' })
        if (!res.ok) throw new Error(`status:${res.status}`)
        const json = await res.json()
        if (json && json.postalCode) setValue('location', { ...(locationValue ?? {}), postalCode: json.postalCode, subdistrict: sub } as any)
      } catch (e) {
        console.error('[survey] fallback loadPostalCodeFor failed', e)
      }
    }
  }

  // load provinces once
  useEffect(() => {
    let mounted = true
    // use central request helper to include credentials and API prefix
    import('../../../../services/api').then(({ request }) => {
      request('/postal-codes/provinces')
        .then((json) => {
          console.debug('[survey] provinces response', json)
          if (mounted) setProvinces(Array.isArray(json) ? json : [])
        })
        .catch((err) => {
          console.error('[survey] request /postal-codes/provinces failed', err)
          // fallback: try direct fetch to help debug network/auth issues
          try {
            const apiPrefix = import.meta.env.VITE_API_URL ?? '/boswell-api/v1'
            fetch(`${apiPrefix}/postal-codes/provinces`, { credentials: 'include' })
              .then((r) => r.ok ? r.json() : r.text().then((t) => { throw new Error(`status:${r.status} body:${t}`) }))
              .then((json) => {
                console.debug('[survey] fallback provinces response', json)
                if (mounted) setProvinces(Array.isArray(json) ? json : [])
              })
              .catch((err2) => {
                console.error('[survey] fallback provinces fetch failed', err2)
                if (mounted) setProvinces([])
              })
          } catch (e) {
            if (mounted) setProvinces([])
          }
        })
    }).catch((err) => {
      console.error('[survey] import request helper failed', err)
      if (mounted) setProvinces([])
    })
    return () => { mounted = false }
  }, [])

  // Render camera overlay if active
  const CameraOverlay = () => {
    if (!cameraOpenFor) return null
    return (
      <div style={{ position: 'fixed', zIndex: 1200, inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 8, maxWidth: 920, width: '100%', maxHeight: '90%', overflow: 'auto' }}>
          <div style={{ padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>กล้อง</h3>
            <div style={{ display: 'flex', gap: 12, flexDirection: 'column', alignItems: 'center' }}>
              <video ref={videoRef} style={{ width: '100%', maxHeight: 480, background: '#000' }} playsInline muted />
              {capturedTemp ? (
                <img src={capturedTemp} alt="captured" style={{ width: '100%', maxHeight: 480, objectFit: 'contain' }} />
              ) : null}
              <div style={{ display: 'flex', gap: 8 }}>
                {!capturedTemp ? (
                  <button type="button" className="dms-create-btn" onClick={captureFromCamera}>ถ่าย</button>
                ) : (
                  <>
                    <button type="button" className="dms-create-btn" onClick={confirmCaptured}>ใช้รูปนี้</button>
                    <button type="button" className="dms-back-btn" onClick={() => setCapturedTemp(null)}>ถ่ายใหม่</button>
                  </>
                )}
                <button type="button" className="dms-back-btn" onClick={closeCamera}>ปิดกล้อง</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  useEffect(() => {
    if (!cameraOpenFor) return
    if (videoRef.current && streamRef.current) {
      try { videoRef.current.srcObject = streamRef.current; videoRef.current.play() } catch {}
    }
  }, [cameraOpenFor])

  // ปิดกล้องเมื่อ component ถูกถอดออก
  useEffect(() => () => stopStream(), [])

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
      const url = new URL('https://nominatim.openstreetmap.org/search')
      url.searchParams.set('q', t)
      url.searchParams.set('format', 'jsonv2')
      url.searchParams.set('addressdetails', '1')
      url.searchParams.set('limit', '8')
      url.searchParams.set('accept-language', 'th')
      url.searchParams.set('countrycodes', 'th')
      const res = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } })
      if (!res.ok) throw new Error('ไม่สามารถค้นหาที่อยู่ได้')
      const json = await res.json()
      setSearchResults(Array.isArray(json) ? json : [])
      if (!Array.isArray(json) || json.length === 0) setSearchError('ไม่พบผลการค้นหา')
      setLastSearched(t)
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : String(err))
    } finally { setSearchLoading(false) }
  }

  // Debounce searchQuery changes: 500ms
  useEffect(() => {
    if (skipSearchRef.current) { skipSearchRef.current = false; return }
    if (!searchQuery || searchQuery.trim().length <= 2) {
      setSearchResults([])
      setSearchError(null)
      setSearchLoading(false)
      setLastSearched('')
      return
    }
    setSearchLoading(true)
    const id = setTimeout(() => void doSearch(searchQuery), 500)
    return () => clearTimeout(id)
  }, [searchQuery])

  // เลือกผลการค้นหา -> วางหมุด + ซูมเข้าไปที่ตำแหน่ง
  const selectSearchResult = (r: any) => {
    const lat = Number(r.lat); const lng = Number(r.lon)
    setTempPos({ lat, lng })
    mapRef.current?.flyTo([lat, lng], 18, { duration: 1 })
    setSearchResults([])
    setSearchError(null)
    setLastSearched('')
    skipSearchRef.current = true
    setSearchQuery(r.name || String(r.display_name).split(',')[0])
  }

  // ปุ่มไอคอนตำแหน่งปัจจุบัน -> วางหมุด + ซูมไปที่ตำแหน่งที่อยู่
  const useCurrentLocation = () => {
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

  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse')
      url.searchParams.set('lat', String(lat))
      url.searchParams.set('lon', String(lon))
      url.searchParams.set('format', 'jsonv2')
      url.searchParams.set('addressdetails', '1')
      url.searchParams.set('accept-language', 'th')
      const res = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } })
      if (!res.ok) throw new Error('ไม่สามารถดึงข้อมูลที่อยู่ได้')
      return await res.json()
    } catch (e) { return null }
  }

  const confirmLocation = async () => {
    if (!tempPos) return
    const rev = await reverseGeocode(tempPos.lat, tempPos.lng)
    const addr = rev?.address ?? {}

    // จังหวัด: กรุงเทพฯ ใน Nominatim มักอยู่ใน state หรือ city
    let province: string = addr.state || addr.province || addr.region || ''
    if (!province && /กรุงเทพ|bangkok/i.test(addr.city || '')) province = addr.city
    if (/^bangkok$/i.test(province)) province = 'กรุงเทพมหานคร'
    const isBkk = province.includes('กรุงเทพ')

    // อำเภอ/เขต: ห้ามเอา city ที่เป็นชื่อจังหวัดมาใส่
    const districtRaw: string =
      addr.city_district || addr.county || addr.district ||
      (addr.city && addr.city !== province ? addr.city : '') ||
      addr.town || ''

    // ตำบล/แขวง
    const subdistrictRaw: string =
      addr.suburb || addr.subdistrict || addr.quarter || addr.neighbourhood || addr.village || ''

    // เติมคำนำหน้าแบบไทยถ้ายังไม่มี
    const withPrefix = (v: string, prefix: string, existing: string[]) =>
      !v ? '' : existing.some((p) => v.startsWith(p)) ? v : `${prefix}${v}`
    const subdistrict = withPrefix(subdistrictRaw, isBkk ? 'แขวง' : 'ตำบล', ['แขวง', 'ตำบล', 'ต.'])
    const district = withPrefix(districtRaw, isBkk ? 'เขต' : 'อำเภอ', ['เขต', 'อำเภอ', 'อ.'])

    // ประกอบที่อยู่แบบไทย: เลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์
    const road: string = addr.road || ''
    const provinceText = province && !isBkk && !province.startsWith('จังหวัด') ? `จังหวัด${province}` : province
    const address = [
      addr.house_number,
      addr.building || addr.amenity || '',
      road && (road.startsWith('ถนน') || road.startsWith('ซอย') ? road : `ถนน${road}`),
      subdistrict,
      district,
      provinceText,
      addr.postcode,
    ].filter(Boolean).join(' ') || rev?.display_name || ''

    // Preserve existing location where possible; set latitude/longitude/address/country and province
    const prev = (locationValue ?? {}) as any
    const base = {
      ...prev,
      latitude: Number(tempPos.lat),
      longitude: Number(tempPos.lng),
      address,
      country: addr.country || 'ประเทศไทย',
    } as any

    // Set province (do not clear province when missing)
    const provinceVal = province || (prev && prev.province) || ''
    setValue('location', { ...base, province: provinceVal } as any)

    // Load districts for this province so user can select if reverse geocode lacked district
    const districtsList = provinceVal ? await loadDistrictsFor(provinceVal) : []

    // Helper to clear lower levels
    const clearLower = (loc: any) => ({ ...loc, district: '', subdistrict: '', postalCode: '' })

    // Decide district
    const geoDistrict = district || ''
    const prevDistrict = (prev && prev.district) || ''

    if (geoDistrict) {
      // if geocoded district matches DB options, set it and proceed
      if (districtsList.includes(geoDistrict)) {
        setValue('location', { ...base, province: provinceVal, district: geoDistrict } as any)
        // load subdistricts and decide subdistrict
        const subList = await loadSubdistrictsFor(provinceVal, geoDistrict)
        const geoSub = subdistrict || ''
        if (geoSub && subList.includes(geoSub)) {
          setValue('location', { ...base, province: provinceVal, district: geoDistrict, subdistrict: geoSub, postalCode: addr.postcode || '' } as any)
          // if postal code missing, fetch from DB
          if (!addr.postcode) await loadPostalCodeFor(provinceVal, geoDistrict, geoSub)
        } else {
          // geocoded subdistrict absent or not matching DB — keep district selected, let user select subdistrict
          setValue('location', { ...base, province: provinceVal, district: geoDistrict, subdistrict: prev.subdistrict || '', postalCode: prev.postalCode || '' } as any)
          // ensure subdistrict options are loaded (already via loadSubdistrictsFor)
        }
      } else {
        // geocoded district not in DB — do not set it; keep previous if valid
        if (prevDistrict && districtsList.includes(prevDistrict)) {
          // keep prevDistrict and load subdistricts
          setValue('location', { ...base, province: provinceVal, district: prevDistrict } as any)
          const subList = await loadSubdistrictsFor(provinceVal, prevDistrict)
          const prevSub = prev.subdistrict || ''
          if (prevSub && subList.includes(prevSub)) {
            setValue('location', { ...base, province: provinceVal, district: prevDistrict, subdistrict: prevSub } as any)
            if (!prev.postalCode) await loadPostalCodeFor(provinceVal, prevDistrict, prevSub)
          } else {
            setValue('location', { ...base, province: provinceVal, district: prevDistrict, subdistrict: '', postalCode: '' } as any)
          }
        } else {
          // clear lower levels but keep province
          setValue('location', clearLower({ ...base, province: provinceVal }) as any)
        }
      }
    } else {
      // No geocoded district — keep prev if it belongs to this province; otherwise clear district/subdistrict/postalCode but leave province
      if (prevDistrict && districtsList.includes(prevDistrict)) {
        // keep prevDistrict and load subdistricts
        setValue('location', { ...base, province: provinceVal, district: prevDistrict } as any)
        const subList = await loadSubdistrictsFor(provinceVal, prevDistrict)
        const prevSub = prev.subdistrict || ''
        if (prevSub && subList.includes(prevSub)) {
          setValue('location', { ...base, province: provinceVal, district: prevDistrict, subdistrict: prevSub } as any)
          if (!prev.postalCode && prevSub) await loadPostalCodeFor(provinceVal, prevDistrict, prevSub)
        } else {
          setValue('location', { ...base, province: provinceVal, district: prevDistrict, subdistrict: '', postalCode: '' } as any)
        }
      } else {
        // no prev or prev not valid for this province: clear district/subdistrict/postalCode but keep province
        setValue('location', clearLower({ ...base, province: provinceVal }) as any)
      }
    }
  }

  const showDropdown =
    searchLoading || searchResults.length > 0 || !!searchError || !!geoError

  return (
    <>
    <form className="survey-form" onSubmit={handleSubmit((v) => onSave(v, true))}>
      <section className="dms-pm-create-section">
        <h3>ข้อมูลโครงการ</h3>
        <label className="dms-form-field">
          <span className="dms-form-label">วันที่สำรวจ <span className="required-mark" style={{ color: 'red' }}>*</span></span>
          <input className="dms-form-input" type="date" {...register('surveyDate', { required: true })} />
          <small className="dms-form-help">วันที่ทำการสำรวจ (เลือกวันที่)</small>
        </label>
        <label className="dms-form-field">
          <span className="dms-form-label">ชื่อโครงการ / อาคาร <span className="required-mark" style={{ color: 'red' }}>*</span></span>
          <input className="dms-form-input" placeholder="เช่น อาคารสำนักงานใหญ่" {...register('projectName', { required: true })} />
          <small className="dms-form-help">ชื่ออาคารหรือโครงการที่เข้าตรวจ</small>
        </label>
        <div className="dms-pm-create-grid">
          <label className="dms-form-field">
            <span className="dms-form-label">จำนวนชั้น</span>
            <input className="dms-form-input" type="number" placeholder="เช่น 5" {...register('floors', { valueAsNumber: true })} />
            <small className="dms-form-help">จำนวนชั้นทั้งหมดของอาคาร</small>
          </label>
        </div>

        <div className="dms-pm-create-grid">
          <label className="dms-form-field">
            <span className="dms-form-label">ผู้ติดต่อ (ชื่อ) <span className="required-mark" style={{ color: 'red' }}>*</span></span>
            <input className="dms-form-input" placeholder="เช่น นายสมชาย ใจดี" {...register('contact1.name', { required: true })} />
            <small className="dms-form-help">ชื่อผู้ประสานงานหน้างาน</small>
          </label>
          <label className="dms-form-field">
            <span className="dms-form-label">ผู้ติดต่อ (โทรศัพท์) <span className="required-mark" style={{ color: 'red' }}>*</span></span>
            <input className="dms-form-input" placeholder="เช่น 0812345678" {...register('contact1.phone', { required: true })} />
            <small className="dms-form-help">หมายเลขที่ติดต่อได้</small>
          </label>
        </div>
        <div className="dms-pm-create-grid">
          <label className="dms-form-field">
            <span className="dms-form-label">ตำแหน่ง <span className="required-mark" style={{ color: 'red' }}>*</span></span>
            <input className="dms-form-input" placeholder="เช่น หัวหน้างาน" {...register('contact1.position', { required: true })} />
            <small className="dms-form-help">ตำแหน่งของผู้ติดต่อ</small>
          </label>
          <label className="dms-form-field">
            <span className="dms-form-label">ประเภทการเยี่ยม</span>
            <select className="dms-form-input" {...register('visitType')}>
              <option value="">เลือก</option>
              <option value="contact_new">ติดต่อเข้าพบใหม่</option>
              <option value="ref_doc">อ้างอิงเอกสารที่เคยขาย</option>
            </select>
            <small className="dms-form-help">เลือกประเภทการเยี่ยมหน้างาน</small>
          </label>
        </div>

        <label className="dms-form-field dms-form-field--full">
          <span className="dms-form-label">ป้ายชื่ออาคาร</span>
          <small className="dms-form-help">ถ่ายให้เห็นชื่ออาคารหรือโครงการชัดเจน</small>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input style={{ display: 'none' }} id="signPhotoInput" type="file" accept="image/*" onChange={(e) => handleFile(e, 'signPhoto')} />
            <button type="button" className="dms-create-btn" onClick={() => openCamera('signPhoto')}>เปิดกล้อง</button>
            <button type="button" className="dms-create-btn" onClick={() => (document.getElementById('signPhotoInput') as HTMLInputElement).click()}>เลือกรูป</button>
            {watch('signPhoto') ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <img src={String(watch('signPhoto'))} alt="sign" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6 }} />
                <button type="button" className="dms-back-btn" onClick={() => removeSurveyPhoto('signPhoto')}>ลบรูป</button>
              </div>
            ) : null}
          </div>
        </label>
      </section>

      <section className="dms-pm-create-section">
        <h3>ตำแหน่งโครงการ</h3>

        <div style={{ position: 'relative', height: 380, borderRadius: 8, overflow: 'hidden' }}>
          <MapContainer center={initialCenter} zoom={initialZoom} style={{ height: '100%', width: '100%' }}>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapEvents mapRef={mapRef} onPick={(lat, lng) => setTempPos({ lat, lng })} />
            {tempPos ? <Marker position={[tempPos.lat, tempPos.lng]} icon={DefaultIcon} /> : null}
          </MapContainer>

          {/* แถบค้นหา + ปุ่มตำแหน่ง ลอยบนแผนที่ */}
          <div style={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 1000 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.25)', padding: '0 10px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
                <input
                  style={{ flex: 1, border: 'none', outline: 'none', padding: '10px 8px', fontSize: 14, background: 'transparent' }}
                  placeholder="ค้นหาสถานที่ / บริษัท / ที่อยู่"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); void doSearch(searchQuery) } // กัน form submit
                  }}
                />
                {searchQuery ? (
                  <button type="button" aria-label="ล้าง" onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchError(null); setLastSearched('') }}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: '#888' }}>×</button>
                ) : null}
              </div>

              {/* ปุ่มไอคอนตำแหน่งปัจจุบัน */}
              <button
                type="button"
                title="ตำแหน่งปัจจุบันของฉัน"
                aria-label="ใช้ตำแหน่งปัจจุบัน"
                onClick={useCurrentLocation}
                disabled={geoLoading}
                style={{ width: 42, height: 42, borderRadius: 8, border: 'none', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: geoLoading ? 0.6 : 1 }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="3" fill="#1a73e8" />
                  <circle cx="12" cy="12" r="8" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                </svg>
              </button>
            </div>

            {/* ผลการค้นหา */}
            {showDropdown && (
              <div style={{ marginTop: 6, background: '#fff', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.25)', maxHeight: 220, overflowY: 'auto' }}>
                {searchLoading && !searchResults.length ? <div style={{ padding: 12 }}>กำลังค้นหา...</div> : null}
                {geoError ? <div style={{ padding: 12, color: '#c62828' }}>{geoError}</div> : null}
                {!searchLoading && searchError ? <div style={{ padding: 12, color: '#c62828' }}>{searchError}</div> : null}
                {searchResults.map((r, idx) => (
                  <button key={idx} type="button" onClick={() => selectSearchResult(r)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: 12, border: 'none', borderBottom: '1px solid #eee', background: 'transparent', cursor: 'pointer' }}>
                    <div style={{ fontWeight: 600 }}>{r.name || String(r.display_name).split(',')[0]}</div>
                    <div style={{ color: '#555', fontSize: 13 }}>{r.display_name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
          <button type="button" className="dms-create-btn" onClick={() => void confirmLocation()} disabled={!tempPos}>เลือกตำแหน่งนี้</button>
          <button type="button" className="dms-back-btn" onClick={() => {
            const lat = tempPos ? tempPos.lat : locationValue?.latitude
            const lng = tempPos ? tempPos.lng : locationValue?.longitude
            if (!lat || !lng) return
            window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank')
          }} disabled={!tempPos && !(locationValue && locationValue.latitude && locationValue.longitude)}>เปิดใน Google Maps</button>
        </div>

        {/* editable address fields */}
        <div style={{ marginTop: 12 }}>
          <label className="dms-form-field">
            <span className="dms-form-label">ที่อยู่</span>
            <input className="dms-form-input" placeholder="ที่อยู่" value={locationValue?.address ?? ''} onChange={(e) => setValue('location', { ...(locationValue ?? {}), address: e.target.value } as any)} />
          </label>

          {/* Order: จังหวัด -> อำเภอ/เขต -> ตำบล/แขวง -> รหัสไปรษณีย์ */}
          <div className="dms-pm-create-grid">
            <label className="dms-form-field">
              <span className="dms-form-label">จังหวัด</span>
              <select className="dms-form-input" value={locationValue?.province ?? ''} onChange={(e) => {
                const v = e.target.value
                // clear dependent fields when province changes
                setValue('location', { ...(locationValue ?? {}), province: v, district: '', subdistrict: '', postalCode: '' } as any)
                setDistricts([])
                setSubdistricts([])
                if (v) {
                  import('../../../../services/api').then(({ request }) =>
                    request(`/postal-codes/districts?province=${encodeURIComponent(v)}`)
                      .then((json) => { console.debug('[survey] districts response for', v, json); setDistricts(Array.isArray(json) ? json : []) })
                      .catch((err) => {
                        console.error('[survey] request districts failed', err)
                        // fallback direct fetch for debugging
                        const apiPrefix = import.meta.env.VITE_API_URL ?? '/boswell-api/v1'
                        fetch(`${apiPrefix}/postal-codes/districts?province=${encodeURIComponent(v)}`, { credentials: 'include' })
                          .then((r) => r.ok ? r.json() : r.text().then((t) => { throw new Error(`status:${r.status} body:${t}`) }))
                          .then((json) => { console.debug('[survey] fallback districts', json); setDistricts(Array.isArray(json) ? json : []) })
                          .catch((e) => { console.error('[survey] fallback districts failed', e); setDistricts([]) })
                      })
                  ).catch((err) => { console.error('[survey] import request helper failed for districts', err); setDistricts([]) })
                }
              }}>
                <option value="">เลือกจังหวัด</option>
                {(provinces || []).map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>

            <label className="dms-form-field">
              <span className="dms-form-label">อำเภอ/เขต</span>
              <select className="dms-form-input" value={locationValue?.district ?? ''} onChange={(e) => {
                const v = e.target.value
                // clear dependent fields when district changes
                setValue('location', { ...(locationValue ?? {}), district: v, subdistrict: '', postalCode: '' } as any)
                setSubdistricts([])
                const prov = (locationValue?.province || '').trim()
                // prefer using prov from state; if empty, can't fetch
                if (prov && v) {
                  import('../../../../services/api').then(({ request }) =>
                    request(`/postal-codes/subdistricts?province=${encodeURIComponent(prov)}&district=${encodeURIComponent(v)}`)
                      .then((json) => { console.debug('[survey] subdistricts response for', prov, v, json); setSubdistricts(Array.isArray(json) ? json : []) })
                      .catch((err) => {
                        console.error('[survey] request subdistricts failed', err)
                        const apiPrefix = import.meta.env.VITE_API_URL ?? '/boswell-api/v1'
                        fetch(`${apiPrefix}/postal-codes/subdistricts?province=${encodeURIComponent(prov)}&district=${encodeURIComponent(v)}`, { credentials: 'include' })
                          .then((r) => r.ok ? r.json() : r.text().then((t) => { throw new Error(`status:${r.status} body:${t}`) }))
                          .then((json) => { console.debug('[survey] fallback subdistricts', json); setSubdistricts(Array.isArray(json) ? json : []) })
                          .catch((e) => { console.error('[survey] fallback subdistricts failed', e); setSubdistricts([]) })
                      })
                  ).catch((err) => { console.error('[survey] import request helper failed for subdistricts', err); setSubdistricts([]) })
                }
              }} disabled={!districts || districts.length === 0}>
                <option value="">เลือกอำเภอ/เขต</option>
                {(districts || []).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
          </div>

          <div className="dms-pm-create-grid">
            <label className="dms-form-field">
              <span className="dms-form-label">ตำบล/แขวง</span>
              <select className="dms-form-input" value={locationValue?.subdistrict ?? ''} onChange={(e) => {
                const v = e.target.value
                setValue('location', { ...(locationValue ?? {}), subdistrict: v } as any)
                const prov = (locationValue?.province || '').trim()
                const dist = (locationValue?.district || '').trim()
                if (prov && dist && v) {
                  import('../../../../services/api').then(({ request }) =>
                    request(`/postal-codes/postal-code?province=${encodeURIComponent(prov)}&district=${encodeURIComponent(dist)}&subdistrict=${encodeURIComponent(v)}`)
                      .then((json) => {
                        console.debug('[survey] postal-code response', prov, dist, v, json)
                        if (json && json.postalCode) {
                          setValue('location', { ...(locationValue ?? {}), postalCode: json.postalCode, subdistrict: v } as any)
                        }
                      }).catch((err) => {
                        console.error('[survey] request postal-code failed', err)
                        const apiPrefix = import.meta.env.VITE_API_URL ?? '/boswell-api/v1'
                        fetch(`${apiPrefix}/postal-codes/postal-code?province=${encodeURIComponent(prov)}&district=${encodeURIComponent(dist)}&subdistrict=${encodeURIComponent(v)}`, { credentials: 'include' })
                          .then((r) => r.ok ? r.json() : r.text().then((t) => { throw new Error(`status:${r.status} body:${t}`) }))
                          .then((json) => { console.debug('[survey] fallback postal-code', json); if (json && json.postalCode) setValue('location', { ...(locationValue ?? {}), postalCode: json.postalCode, subdistrict: v } as any) })
                          .catch((e) => { console.error('[survey] fallback postal-code failed', e) })
                      })
                  ).catch((err) => { console.error('[survey] import request helper failed for postal-code', err) })
                }
              }} disabled={!subdistricts || subdistricts.length === 0}>
                <option value="">เลือกตำบล/แขวง</option>
                {(subdistricts || []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>

            <label className="dms-form-field">
              <span className="dms-form-label">รหัสไปรษณีย์</span>
              <input className="dms-form-input" placeholder="รหัสไปรษณีย์" value={locationValue?.postalCode ?? ''} onChange={(e) => setValue('location', { ...(locationValue ?? {}), postalCode: e.target.value } as any)} />
            </label>
          </div>
          <div className="dms-pm-create-grid">
            <label className="dms-form-field">
              <span className="dms-form-label">ประเทศ</span>
              <input className="dms-form-input" placeholder="ประเทศ" value={locationValue?.country ?? ''} onChange={(e) => setValue('location', { ...(locationValue ?? {}), country: e.target.value } as any)} />
            </label>
            <label className="dms-form-field">
              <span className="dms-form-label">Latitude / Longitude</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="dms-form-input" placeholder="Latitude" value={locationValue?.latitude ?? ''} onChange={(e) => setValue('location', { ...(locationValue ?? {}), latitude: Number(e.target.value) || 0 } as any)} />
                <input className="dms-form-input" placeholder="Longitude" value={locationValue?.longitude ?? ''} onChange={(e) => setValue('location', { ...(locationValue ?? {}), longitude: Number(e.target.value) || 0 } as any)} />
              </div>
            </label>
          </div>
        </div>
      </section>

      <section className="dms-pm-create-section">
        <h3>Fire Alarm Control Panel (FCP)</h3>
        <div className="dms-pm-create-grid">
          <label className="dms-form-field">
            <span className="dms-form-label">ยี่ห้อ FCP</span>
            <input className="dms-form-input" placeholder="เช่น Notifier" {...register('fcpBrand')} />
            <small className="dms-form-help">ยี่ห้อของตู้ควบคุมระบบแจ้งเหตุเพลิงไหม้</small>
          </label>
          <label className="dms-form-field">
            <span className="dms-form-label">รุ่น</span>
            <input className="dms-form-input" placeholder="เช่น NFS2-3030" {...register('fcpModel')} />
            <small className="dms-form-help">รุ่นหรือหมายเลขบน Nameplate</small>
          </label>
        </div>
        <div className="dms-pm-create-grid">
          <label className="dms-form-field">
            <span className="dms-form-label">ประเภท</span>
            <input className="dms-form-input" placeholder="เช่น Addressable" {...register('fcpType')} />
            <small className="dms-form-help">ประเภทของระบบ FCP</small>
          </label>
          <label className="dms-form-field">
            <span className="dms-form-label">วัสดุตู้</span>
            <input className="dms-form-input" placeholder="เช่น Metal" {...register('fcpMaterial')} />
            <small className="dms-form-help">วัสดุของตู้ FCP (เช่น Metal, Plastic)</small>
          </label>
        </div>
        <label className="dms-form-field">
          <span className="dms-form-label">Status</span>
          <select className="dms-form-input" {...register('fcpStatus')}>
            <option value="">เลือก</option>
            <option value="on">On</option>
            <option value="off">Off</option>
          </select>
          <small className="dms-form-help">On = เปิดใช้งาน, Off = ปิดอยู่</small>
        </label>
        <div className="dms-pm-create-grid">
          <label className="dms-form-field">
            <span className="dms-form-label">FCP overview photo</span>
            <small className="dms-form-help">ถ่ายให้เห็นตู้ FCP ทั้งตู้</small>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input style={{ display: 'none' }} id="fcpOverviewInput" type="file" accept="image/*" onChange={(e) => handleFile(e, 'fcpOverview')} />
              <button type="button" className="dms-create-btn" onClick={() => openCamera('fcpOverview')}>เปิดกล้อง</button>
              <button type="button" className="dms-create-btn" onClick={() => (document.getElementById('fcpOverviewInput') as HTMLInputElement).click()}>เลือกรูป</button>
              {watch('fcpOverview') ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <img src={String(watch('fcpOverview'))} alt="fcp" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6 }} />
                  <button type="button" className="dms-back-btn" onClick={() => removeSurveyPhoto('fcpOverview')}>ลบรูป</button>
                </div>
              ) : null}
            </div>
          </label>
          <label className="dms-form-field">
            <span className="dms-form-label">ป้ายชื่อ / แผงยี่ห้อ</span>
            <small className="dms-form-help">ถ่ายให้เห็น Brand และ Model ชัดเจน</small>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input style={{ display: 'none' }} id="fcpNameplateInput" type="file" accept="image/*" onChange={(e) => handleFile(e, 'fcpNameplate')} />
              <button type="button" className="dms-create-btn" onClick={() => openCamera('fcpNameplate')}>เปิดกล้อง</button>
              <button type="button" className="dms-create-btn" onClick={() => (document.getElementById('fcpNameplateInput') as HTMLInputElement).click()}>เลือกรูป</button>
              {watch('fcpNameplate') ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <img src={String(watch('fcpNameplate'))} alt="fcp-nameplate" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6 }} />
                  <button type="button" className="dms-back-btn" onClick={() => removeSurveyPhoto('fcpNameplate')}>ลบรูป</button>
                </div>
              ) : null}
            </div>
          </label>
          <label className="dms-form-field">
            <span className="dms-form-label">ภายในตู้ / สายไฟ</span>
            <small className="dms-form-help">ถ่ายให้เห็นสภาพภายในตู้และการเดินสาย</small>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input style={{ display: 'none' }} id="fcpInsideInput" type="file" accept="image/*" onChange={(e) => handleFile(e, 'fcpInside')} />
              <button type="button" className="dms-create-btn" onClick={() => openCamera('fcpInside')}>เปิดกล้อง</button>
              <button type="button" className="dms-create-btn" onClick={() => (document.getElementById('fcpInsideInput') as HTMLInputElement).click()}>เลือกรูป</button>
              {watch('fcpInside') ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <img src={String(watch('fcpInside'))} alt="fcp-inside" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6 }} />
                  <button type="button" className="dms-back-btn" onClick={() => removeSurveyPhoto('fcpInside')}>ลบรูป</button>
                </div>
              ) : null}
            </div>
          </label>
        </div>
      </section>

      <section className="dms-pm-create-section">
        <h3>Equipment Checklist</h3>
        {equipment.map((item, idx) => (
          <div key={idx} className="dms-pm-create-grid" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {( (item as any).isCustom || !item.name || item.name === 'อื่นๆ') ? (
                <div style={{ flex: 1 }}>
                  <label className="dms-form-field" style={{ margin: 0 }}>
                    <span className="dms-form-label">อื่นๆ</span>
                    <input className="dms-form-input" placeholder="ระบุอุปกรณ์" {...register(`equipment.${idx}.name` as const)} />
                  </label>
                </div>
              ) : (
                <label className="dms-form-label" style={{ margin: 0 }}>{item.name}</label>
              )}
              {((item as any).isCustom || !item.name || item.name === 'อื่นๆ') ? (
                <button type="button" className="dms-back-btn" onClick={() => {
                  const prevArr = watch('equipment') || []
                  const arr = [...prevArr]
                  arr.splice(idx, 1)
                  const clean = arr.map((it: any) => ({ ...it, qty: Number.isFinite(Number(it.qty)) ? Number(it.qty) : undefined }))
                  setValue('equipment', clean)
                }}>ลบ</button>
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
                  <label className="dms-form-field">
                    <span className="dms-form-label">Photo</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input style={{ display: 'none' }} id={`equip-photo-${idx}`} type="file" accept="image/*" onChange={(e) => handleEquipmentFile(e, idx)} />
                      <button type="button" className="dms-create-btn" onClick={() => openCamera(`equip-${idx}`)}>เปิดกล้อง</button>
                      <button type="button" className="dms-create-btn" onClick={() => (document.getElementById(`equip-photo-${idx}`) as HTMLInputElement).click()}>เลือกรูป</button>
                      {equipment[idx]?.photo ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <img src={String(equipment[idx].photo)} alt="equip" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6 }} />
                          <button type="button" className="dms-back-btn" onClick={() => removeEquipmentPhoto(idx)}>ลบรูป</button>
                        </div>
                      ) : null}
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>
        ))}
        <div style={{ marginTop: 8 }}>
          <button type="button" className="dms-create-btn" onClick={() => {
            const prevArr = watch('equipment') || []
          // add a blank-name custom item so the UI shows an editable input immediately; mark isCustom so it remains editable after typing
          const arr = [...prevArr, { name: '', status: 'yes', model: '', qty: undefined, photo: null, isCustom: true } as any]
          const clean = arr.map((it: any) => ({ ...it, qty: Number.isFinite(Number(it.qty)) ? Number(it.qty) : undefined }))
          setValue('equipment', clean)
          }}>เพิ่ม อื่นๆ</button>
        </div>
      </section>

      <section className="dms-pm-create-section">
        <label className="dms-form-field dms-form-field--full">
          <span className="dms-form-label">Notes</span>
          <textarea className="dms-form-input dms-form-textarea" {...register('notes')} />
        </label>
      </section>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <button type="button" className="dms-back-btn" disabled={saving} onClick={() => { handleSubmit((v) => onSave(v, false))() }}>Save draft</button>
        <button type="submit" className="dms-create-btn" disabled={saving}>Submit</button>
      </div>
    </form>
    {CameraOverlay()}
    </>
  )
}