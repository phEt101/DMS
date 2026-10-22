const NOMINATIM = 'https://nominatim.openstreetmap.org'

export async function searchPlaces(q: string): Promise<any> {
  const url = new URL(`${NOMINATIM}/search`)
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('limit', '8')
  url.searchParams.set('accept-language', 'th')
  url.searchParams.set('countrycodes', 'th')
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('ไม่สามารถค้นหาที่อยู่ได้')
  return res.json()
}

export async function reverseGeocode(lat: number, lon: number): Promise<any | null> {
  try {
    const url = new URL(`${NOMINATIM}/reverse`)
    url.searchParams.set('lat', String(lat))
    url.searchParams.set('lon', String(lon))
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('accept-language', 'th')
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error('ไม่สามารถดึงข้อมูลที่อยู่ได้')
    return await res.json()
  } catch {
    return null
  }
}

/** แปลงผล reverse geocode ของ Nominatim เป็นจังหวัด/อำเภอ/ตำบล/ที่อยู่แบบไทย */
export function parseThaiAddress(rev: any) {
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

  return {
    province,
    district,
    subdistrict,
    address,
    postcode: addr.postcode as string | undefined,
    country: (addr.country as string | undefined) || 'ประเทศไทย',
  }
}
