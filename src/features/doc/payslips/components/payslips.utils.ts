export type PayslipsSharedProps = {
  copy: Record<string, string>
  locale: string
  periodLabel: (year: number, month: number) => string
  errorText: (error: unknown) => string
}

export type PayslipFilter = 'all' | 'pending' | 'sent' | 'viewed'

export const MAX_PAYSLIP_BYTES = 5 * 1024 * 1024

export const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''))

export function formatFileSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function canPreviewPayslip(fileName: string) {
  return /\.(pdf|png|jpe?g|gif|webp)$/i.test(fileName)
}
