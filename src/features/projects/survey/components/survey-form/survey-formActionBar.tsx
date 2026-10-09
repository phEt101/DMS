/**
- แถบปุ่ม Save draft / Submit ที่ติดอยู่ด้านบนของฟอร์ม (sticky)
- เลื่อนฟอร์มไปถึงไหนก็กดได้เลย ไม่ต้องเลื่อนลงไปล่างสุด
- zIndex 1100 เพื่ออยู่เหนือ control ของ Leaflet (สูงสุด 1000) แต่ต่ำกว่า CameraOverlay (1200)
 */
export default function ActionBar({
  saving,
  onSaveDraft,
  translations,
}: {
  saving: boolean
  onSaveDraft: () => void
  translations?: any
}) {
  const t = translations?.features?.survey ?? {}
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center', // จัดแนวปุ่มให้อยู่กึ่งกลางแนวตั้งเท่ากัน
        justifyContent: 'flex-end',
        gap: 12,
        padding: '10px 16px',
        marginBottom: 12,
        background: 'transparent',
        borderBottom: '1px solid rgba(0,0,0,0.03)',
      }}
    >
      <button
        type="button"
        className="dms-back-btn"
        disabled={saving}
        onClick={onSaveDraft}
        style={{
          minWidth: 140,
          height: 44,
          padding: '0 18px',
          margin: 0,
          boxSizing: 'border-box',
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 600,
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
          color: '#1f2937',
          border: '1px solid rgba(15,23,42,0.12)',
          boxShadow: 'none',
          cursor: saving ? 'not-allowed' : 'pointer',
        }}
      >
        {t.form?.actions?.saveDraft ?? 'Save draft'}
      </button>

      <button
        type="submit"
        className="dms-create-btn"
        disabled={saving}
        style={{
          minWidth: 140,
          height: 44,
          padding: '0 18px',
          margin: 0,
          boxSizing: 'border-box',
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 700,
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#5B46FF',
          color: '#fff',
          border: 'none',
          boxShadow: '0 8px 20px rgba(91,70,255,0.24)',
          cursor: saving ? 'not-allowed' : 'pointer',
        }}
      >
        {t.form?.actions?.submit ?? 'Submit'}
      </button>
    </div>
  )
}