import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import MapEvents from '../MapEvents'
import { DefaultIcon } from './utils'
import type { LocationPicker } from './useLocationPicker'

export default function MapPicker({ picker }: { picker: LocationPicker }) {
  const {
    initialCenter, initialZoom, tempPos, setTempPos, mapRef,
    searchQuery, setSearchQuery, clearSearch, doSearch,
    searchLoading, searchResults, searchError, geoError, geoLoading, showDropdown,
    selectSearchResult, locateMe,
  } = picker

  return (
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
              <button type="button" aria-label="ล้าง" onClick={clearSearch}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: '#888' }}>×</button>
            ) : null}
          </div>

          {/* ปุ่มไอคอนตำแหน่งปัจจุบัน */}
          <button
            type="button"
            title="ตำแหน่งปัจจุบันของฉัน"
            aria-label="ใช้ตำแหน่งปัจจุบัน"
            onClick={locateMe}
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
  )
}
