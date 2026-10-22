import { useEffect, useRef, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { Survey } from '../../types'

type FormApi = Pick<UseFormReturn<Survey>, 'watch' | 'setValue'>

export function useCamera({ watch, setValue }: FormApi) {
  // e.g. 'signPhoto' or 'fcpOverview' or 'equip-0'
  const [cameraOpenFor, setCameraOpenFor] = useState<string | null>(null)
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
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        streamRef.current = stream
      } catch {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true })
          streamRef.current = stream
        } catch {
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
    setCapturedTemp(canvas.toDataURL('image/jpeg', 0.9))
  }

  const confirmCaptured = () => {
    if (!cameraOpenFor || !capturedTemp) return
    if (cameraOpenFor.startsWith('equip-')) {
      const idx = Number(cameraOpenFor.split('-')[1])
      const arr = (watch('equipment') || []) as any[]
      arr[idx] = { ...arr[idx], photo: capturedTemp }
      setValue('equipment', arr)
    } else {
      setValue(cameraOpenFor as any, capturedTemp)
    }
    closeCamera()
  }

  const retake = () => setCapturedTemp(null)

  // เมื่อเปิดกล้อง ให้ผูก stream เข้ากับ video element
  useEffect(() => {
    if (!cameraOpenFor) return
    if (videoRef.current && streamRef.current) {
      try { videoRef.current.srcObject = streamRef.current; videoRef.current.play() } catch {}
    }
  }, [cameraOpenFor])

  // ปิดกล้องเมื่อ component ถูกถอดออก
  useEffect(() => () => stopStream(), [])

  return { cameraOpenFor, capturedTemp, videoRef, openCamera, closeCamera, captureFromCamera, confirmCaptured, retake }
}
