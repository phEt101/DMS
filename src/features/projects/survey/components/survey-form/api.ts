/**
 * GET ผ่าน central request helper (แนบ credentials + API prefix ให้)
 * ถ้าล้มเหลวจะ fallback ไป fetch ตรง ๆ เหมือนเดิม
 */
export async function apiGet(path: string): Promise<any> {
  try {
    const { request } = await import('../../../../../services/api')
    return await request(path)
  } catch (err) {
    console.error('[survey] request failed', path, err)
    const apiPrefix = import.meta.env.VITE_API_URL ?? '/boswell-api/v1'
    const res = await fetch(`${apiPrefix}${path}`, { credentials: 'include' })
    if (!res.ok) throw new Error(`status:${res.status}`)
    return res.json()
  }
}
