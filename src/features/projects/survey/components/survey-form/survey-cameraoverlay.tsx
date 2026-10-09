import React from 'react'

export default function CameraOverlay({
  cameraOpenFor,
  capturedTemp,
  videoRef,
  onCapture,
  onConfirm,
  onRetake,
  onClose,
}: {
  cameraOpenFor: string | null
  capturedTemp: string | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  onCapture: () => void
  onConfirm: () => void
  onRetake: () => void
  onClose: () => void
}) {
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
                <button type="button" className="dms-create-btn" onClick={onCapture}>ถ่าย</button>
              ) : (
                <>
                  <button type="button" className="dms-create-btn" onClick={onConfirm}>ใช้รูปนี้</button>
                  <button type="button" className="dms-back-btn" onClick={onRetake}>ถ่ายใหม่</button>
                </>
              )}
              <button type="button" className="dms-back-btn" onClick={onClose}>ปิดกล้อง</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
