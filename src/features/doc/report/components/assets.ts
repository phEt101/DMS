export type SignatureImage = {
  dataUri: string
  bytes: Uint8Array
  width: number
  height: number
}

const MAX_SIDE = 600

/** โหลดรูปลายเซ็น (data URI หรือ URL) แล้วแปลงเป็น PNG เพื่อฝังใน xlsx/docx ได้แน่นอน */
export async function loadSignature(src: string | null | undefined): Promise<SignatureImage | null> {
  if (!src) return null
  let objectUrl: string | null = null
  try {
    const response = await fetch(src)
    if (!response.ok) return null
    objectUrl = URL.createObjectURL(await response.blob())
    const image = new Image()
    image.src = objectUrl
    await image.decode()
    const naturalW = image.naturalWidth || 300
    const naturalH = image.naturalHeight || 100
    const scale = Math.min(1, MAX_SIDE / Math.max(naturalW, naturalH))
    const width = Math.max(1, Math.round(naturalW * scale))
    const height = Math.max(1, Math.round(naturalH * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')!.drawImage(image, 0, 0, width, height)
    const dataUri = canvas.toDataURL('image/png')
    const binary = atob(dataUri.split(',')[1])
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return { dataUri, bytes, width, height }
  } catch {
    return null // ลายเซ็นโหลดไม่ได้ → export ต่อโดยเว้นช่องว่างไว้ให้เซ็นมือ
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }
}

export const createSignatureLoader = () => {
  const cache = new Map<string, Promise<SignatureImage | null>>()
  return (src: string | null | undefined) => {
    if (!src) return Promise.resolve(null)
    let pending = cache.get(src)
    if (!pending) {
      pending = loadSignature(src)
      cache.set(src, pending)
    }
    return pending
  }
}

export const fitSize = (image: { width: number; height: number }, maxW: number, maxH: number) => {
  const ratio = Math.min(maxW / image.width, maxH / image.height, 1)
  return { width: Math.round(image.width * ratio), height: Math.round(image.height * ratio) }
}

export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}