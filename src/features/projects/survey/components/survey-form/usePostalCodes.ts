import { useEffect, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { Survey } from '../../types'
import { apiGet } from './api'

const toList = (json: any): string[] => (Array.isArray(json) ? json : [])
const enc = encodeURIComponent

export function usePostalCodes({
  initialLocation,
  getValues,
  updateLocation,
}: {
  initialLocation?: { province?: string | null; district?: string | null } | null
  getValues: UseFormReturn<Survey>['getValues']
  updateLocation: (patch: Record<string, any>) => void
}) {
  // Location lists from backend (seeded postal_codes)
  const [provinces, setProvinces] = useState<string[] | null>(null)
  const [districts, setDistricts] = useState<string[] | null>(null)
  const [subdistricts, setSubdistricts] = useState<string[] | null>(null)

  // load provinces once
  useEffect(() => {
    let mounted = true
    apiGet('/postal-codes/provinces')
      .then((json) => { if (mounted) setProvinces(toList(json)) })
      .catch((err) => {
        console.error('[survey] load provinces failed', err)
        if (mounted) setProvinces([])
      })
    return () => { mounted = false }
  }, [])

  const loadDistrictsFor = async (prov: string) => {
    try {
      const list = toList(await apiGet(`/postal-codes/districts?province=${enc(prov)}`))
      setDistricts(list)
      return list
    } catch (err) {
      console.error('[survey] loadDistrictsFor failed', err)
      setDistricts([])
      return [] as string[]
    }
  }

  const loadSubdistrictsFor = async (prov: string, dist: string) => {
    try {
      const list = toList(await apiGet(`/postal-codes/subdistricts?province=${enc(prov)}&district=${enc(dist)}`))
      setSubdistricts(list)
      return list
    } catch (err) {
      console.error('[survey] loadSubdistrictsFor failed', err)
      setSubdistricts([])
      return [] as string[]
    }
  }

  // โหมดแก้ไข: โหลดรายการอำเภอ/ตำบลของจังหวัดที่บันทึกไว้ เพื่อให้ dropdown แสดงค่าเดิม
  useEffect(() => {
    const prov = (initialLocation?.province || '').trim()
    const dist = (initialLocation?.district || '').trim()
    if (!prov) return
    void loadDistrictsFor(prov)
    if (dist) void loadSubdistrictsFor(prov, dist)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadPostalCodeFor = async (prov: string, dist: string, sub: string) => {
    try {
      const json = await apiGet(`/postal-codes/postal-code?province=${enc(prov)}&district=${enc(dist)}&subdistrict=${enc(sub)}`)
      if (json && json.postalCode) updateLocation({ postalCode: json.postalCode, subdistrict: sub })
    } catch (err) {
      console.error('[survey] loadPostalCodeFor failed', err)
    }
  }

  // ---- handlers สำหรับ dropdown ----
  const onProvinceChange = (v: string) => {
    // clear dependent fields when province changes
    updateLocation({ province: v, district: '', subdistrict: '', postalCode: '' })
    setDistricts([])
    setSubdistricts([])
    if (v) void loadDistrictsFor(v)
  }

  const onDistrictChange = (v: string) => {
    updateLocation({ district: v, subdistrict: '', postalCode: '' })
    setSubdistricts([])
    const prov = (getValues('location')?.province || '').trim()
    if (prov && v) void loadSubdistrictsFor(prov, v)
  }

  const onSubdistrictChange = (v: string) => {
    updateLocation({ subdistrict: v })
    const loc = getValues('location')
    const prov = (loc?.province || '').trim()
    const dist = (loc?.district || '').trim()
    if (prov && dist && v) void loadPostalCodeFor(prov, dist, v)
  }

  return {
    provinces, districts, subdistricts,
    loadDistrictsFor, loadSubdistrictsFor, loadPostalCodeFor,
    onProvinceChange, onDistrictChange, onSubdistrictChange,
  }
}

export type PostalApi = ReturnType<typeof usePostalCodes>