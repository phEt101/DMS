import type { SessionDevice } from './services/sessions.service'

export function formatDateTime(value: string | null, language: 'th' | 'en'): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(language === 'th' ? 'th-TH' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    hourCycle: 'h23',
  }).format(date)
}

export function formatUpdatedTime(value: string, language: 'th' | 'en'): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(language === 'th' ? 'th-TH' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}

export function deviceLabel(device: SessionDevice | null): string {
  if (!device) return '—'
  return [device.browser, device.os].filter((part) => part && part !== 'Unknown').join(' · ') || '—'
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
