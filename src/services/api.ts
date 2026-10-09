// Derive API prefix. Default to path so Vite dev server proxy works.
const RAW_API_PREFIX = import.meta.env.VITE_API_URL ?? '/boswell-api/v1'
let API_PREFIX = RAW_API_PREFIX

// In dev, developers sometimes set VITE_API_URL to the dev server origin (e.g. http://127.0.0.1:5137/boswell-api/v1)
// If that happens and the origin matches the current page (same host/port), requests end up sent to Vite itself
// instead of the backend. Prefer using the backend port 3000 in that case while keeping production behavior.
if (import.meta.env.DEV) {
  try {
    // If RAW_API_PREFIX is an absolute URL and its origin matches window.location, rewrite to port 3000
    if (RAW_API_PREFIX.startsWith('http')) {
      const url = new URL(RAW_API_PREFIX)
      if (typeof window !== 'undefined' && url.hostname === window.location.hostname && String(url.port) === String(window.location.port)) {
        // replace port with backend default 3000, preserve protocol and pathname
        API_PREFIX = `${url.protocol}//${url.hostname}:3000${url.pathname.replace(/\/$/, '')}`
      }
    }
    // ensure no trailing slash for consistency
    if (API_PREFIX.endsWith('/')) API_PREFIX = API_PREFIX.replace(/\/$/, '')
  } catch (err) {
    // fallback: keep RAW_API_PREFIX
    API_PREFIX = RAW_API_PREFIX
  }
}

export async function request(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers)
  let body: any = options.body

  // If body is present and is not FormData, treat it as JSON and stringify it.
  if (body && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
    if (typeof body !== 'string') {
      try {
        body = JSON.stringify(body)
      } catch (err) {
        // fallback: leave as-is so fetch can attempt to send it
      }
    }
  }

  const url = path.startsWith('http') ? path : `${API_PREFIX}${path}`
  const response = await fetch(url, {
    ...options,
    headers,
    body,
    credentials: "include",
  });

  if (!response.ok) {
    // attempt to parse JSON, otherwise fallback to text for better debugging
    let parsed: any = null
    let text: string | null = null
    try {
      parsed = await response.json()
    } catch (err) {
      try { text = await response.text() } catch (e) { text = null }
    }
    // prefer common error fields from backend, fallback to text or status
    const errMsg = parsed?.error ?? parsed?.message ?? (typeof parsed === 'string' ? parsed : null) ?? text ?? `Request failed: ${response.status}`
    console.error('API request failed', { url, status: response.status, body: parsed ?? text })
    const err = new Error(errMsg)
    ;(err as any).status = response.status
    ;(err as any).body = parsed ?? text
    throw err
  }

  if (response.status === 204) return null
  return response.json()
}
