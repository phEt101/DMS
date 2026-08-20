const API_PREFIX = import.meta.env.VITE_API_URL ?? '/api/v1'

export async function request(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers)
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const url = path.startsWith('http') ? path : `${API_PREFIX}${path}`
  const response = await fetch(url, {
    headers,
    ...options,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message ?? `Request failed: ${response.status}`)
  }

  if (response.status === 204) return null
  return response.json()
}
