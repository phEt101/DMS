import MapPicker from './MapPicker'
import type { LocationPicker } from './useLocationPicker'
import type { PostalApi } from './usePostalCodes'

export default function LocationSection({
  locationValue,
  updateLocation,
  picker,
  postal,
}: {
  locationValue: any
  updateLocation: (patch: Record<string, any>) => void
  picker: LocationPicker
  postal: PostalApi
}) {
  const { tempPos, confirmLocation } = picker
  const { provinces, districts, subdistricts } = postal
  // ถ้าค่าปัจจุบันไม่อยู่ในรายการ (เช่น รายการยังโหลดไม่เสร็จ) ให้เพิ่มเป็นตัวเลือกเพื่อให้ยังแสดงค่าอยู่
  const withCurrent = (list: string[] | null, current?: string | null) => {
    const arr = list ?? []
    return current && !arr.includes(current) ? [current, ...arr] : arr
  }
  const provinceOptions = withCurrent(provinces, locationValue?.province)
  const districtOptions = withCurrent(districts, locationValue?.district)
  const subdistrictOptions = withCurrent(subdistricts, locationValue?.subdistrict)
  const hasSavedCoords = !!(locationValue && locationValue.latitude && locationValue.longitude)

  return (
    <section className="dms-pm-create-section">
      <h3>ตำแหน่งโครงการ</h3>

      <MapPicker picker={picker} />

      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
        <button type="button" className="dms-create-btn" onClick={() => void confirmLocation()} disabled={!tempPos}>เลือกตำแหน่งนี้</button>
        <button
          type="button"
          className="dms-back-btn"
          onClick={() => {
            const lat = tempPos ? tempPos.lat : locationValue?.latitude
            const lng = tempPos ? tempPos.lng : locationValue?.longitude
            if (!lat || !lng) return
            window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank')
          }}
          disabled={!tempPos && !hasSavedCoords}
        >เปิดใน Google Maps</button>
      </div>

      {/* editable address fields */}
      <div style={{ marginTop: 12 }}>
        <label className="dms-form-field">
          <span className="dms-form-label">ที่อยู่</span>
          <input className="dms-form-input" placeholder="ที่อยู่" value={locationValue?.address ?? ''} onChange={(e) => updateLocation({ address: e.target.value })} />
        </label>

        {/* Order: จังหวัด -> อำเภอ/เขต -> ตำบล/แขวง -> รหัสไปรษณีย์ */}
        <div className="dms-pm-create-grid">
          <label className="dms-form-field">
            <span className="dms-form-label">จังหวัด</span>
            <select className="dms-form-input" value={locationValue?.province ?? ''} onChange={(e) => postal.onProvinceChange(e.target.value)}>
              <option value="">เลือกจังหวัด</option>
              {provinceOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>

          <label className="dms-form-field">
            <span className="dms-form-label">อำเภอ/เขต</span>
            <select
              className="dms-form-input"
              value={locationValue?.district ?? ''}
              onChange={(e) => postal.onDistrictChange(e.target.value)}
              disabled={districtOptions.length === 0}
            >
              <option value="">เลือกอำเภอ/เขต</option>
              {districtOptions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
        </div>

        <div className="dms-pm-create-grid">
          <label className="dms-form-field">
            <span className="dms-form-label">ตำบล/แขวง</span>
            <select
              className="dms-form-input"
              value={locationValue?.subdistrict ?? ''}
              onChange={(e) => postal.onSubdistrictChange(e.target.value)}
              disabled={subdistrictOptions.length === 0}
            >
              <option value="">เลือกตำบล/แขวง</option>
              {subdistrictOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <label className="dms-form-field">
            <span className="dms-form-label">รหัสไปรษณีย์</span>
            <input className="dms-form-input" placeholder="รหัสไปรษณีย์" value={locationValue?.postalCode ?? ''} onChange={(e) => updateLocation({ postalCode: e.target.value })} />
          </label>
        </div>

        <div className="dms-pm-create-grid">
          <label className="dms-form-field">
            <span className="dms-form-label">ประเทศ</span>
            <input className="dms-form-input" placeholder="ประเทศ" value={locationValue?.country ?? ''} onChange={(e) => updateLocation({ country: e.target.value })} />
          </label>
          <label className="dms-form-field">
            <span className="dms-form-label">Latitude / Longitude</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="dms-form-input" placeholder="Latitude" value={locationValue?.latitude ?? ''} onChange={(e) => updateLocation({ latitude: Number(e.target.value) || 0 })} />
              <input className="dms-form-input" placeholder="Longitude" value={locationValue?.longitude ?? ''} onChange={(e) => updateLocation({ longitude: Number(e.target.value) || 0 })} />
            </div>
          </label>
        </div>
      </div>
    </section>
  )
}