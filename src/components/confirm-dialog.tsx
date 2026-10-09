import React from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'

type Variant = 'default' | 'danger'

type ConfirmDialogProps = {
  open: boolean
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  variant?: Variant
  onOpenChange: (val: boolean) => void
  onConfirm: () => void
}

export default function ConfirmDialog({
  open,
  title = 'Confirm',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  variant = 'default',
  onOpenChange,
  onConfirm,
}: ConfirmDialogProps) {
  // ไม่ให้ปิดระหว่างกำลังโหลด
  const handleOpenChange = (val: boolean) => {
    if (loading) return
    onOpenChange(val)
  }

  return (
    <RadixDialog.Root open={open} onOpenChange={handleOpenChange}>
      <RadixDialog.Portal>
        <style>{styles}</style>
        <RadixDialog.Overlay className="cd-overlay" />
        <RadixDialog.Content
          className="cd-content"
          data-variant={variant}
          onEscapeKeyDown={(e) => loading && e.preventDefault()}
          onPointerDownOutside={(e) => loading && e.preventDefault()}
        >
          <div className="cd-header">
            <div className="cd-icon" aria-hidden="true">
              {variant === 'danger' ? <WarningIcon /> : <InfoIcon />}
            </div>
            <div className="cd-text">
              <RadixDialog.Title className="cd-title">{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="cd-description">
                  {description}
                </RadixDialog.Description>
              ) : null}
            </div>
          </div>

          <div className="cd-footer">
            <RadixDialog.Close asChild>
              <button
                type="button"
                className="cd-btn cd-btn-secondary"
                disabled={loading}
              >
                {cancelLabel}
              </button>
            </RadixDialog.Close>
            <button
              type="button"
              className="cd-btn cd-btn-primary"
              onClick={() => onConfirm()}
              disabled={loading}
              aria-busy={loading}
            >
              {loading && <span className="cd-spinner" aria-hidden="true" />}
              {loading ? 'Please wait...' : confirmLabel}
            </button>
          </div>

          <RadixDialog.Close asChild>
            <button className="cd-close" aria-label="Close" disabled={loading}>
              <CloseIcon />
            </button>
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

/* ---------- Icons ---------- */

function InfoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

/* ---------- Styles ---------- */

const styles = `
.cd-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  z-index: 1000;
  animation: cd-fade-in 160ms ease-out;
}
.cd-overlay[data-state='closed'] { animation: cd-fade-out 120ms ease-in; }

.cd-content {
  --cd-bg: #ffffff;
  --cd-border: #e5e7eb;
  --cd-title: #0f172a;
  --cd-text: #64748b;
  --cd-accent: #2563eb;
  --cd-accent-hover: #1d4ed8;
  --cd-accent-soft: #dbeafe;
  --cd-secondary-bg: #ffffff;
  --cd-secondary-hover: #f3f4f6;

  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: calc(100vw - 32px);
  max-width: 460px;
  padding: 24px;
  background: var(--cd-bg);
  border: 1px solid var(--cd-border);
  border-radius: 16px;
  box-shadow: 0 24px 48px -12px rgba(15, 23, 42, 0.28), 0 4px 12px rgba(15, 23, 42, 0.08);
  z-index: 1001;
  animation: cd-pop-in 180ms cubic-bezier(0.16, 1, 0.3, 1);
}
.cd-content[data-state='closed'] { animation: cd-pop-out 120ms ease-in; }
.cd-content[data-variant='danger'] {
  --cd-accent: #dc2626;
  --cd-accent-hover: #b91c1c;
  --cd-accent-soft: #fee2e2;
}
.cd-content:focus { outline: none; }

@media (prefers-color-scheme: dark) {
  .cd-content {
    --cd-bg: #1e293b;
    --cd-border: #334155;
    --cd-title: #f1f5f9;
    --cd-text: #94a3b8;
    --cd-accent-soft: rgba(37, 99, 235, 0.2);
    --cd-secondary-bg: transparent;
    --cd-secondary-hover: #334155;
  }
  .cd-content[data-variant='danger'] { --cd-accent-soft: rgba(220, 38, 38, 0.2); }
}

.cd-header { display: flex; gap: 16px; align-items: flex-start; padding-right: 24px; }

.cd-icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: var(--cd-accent);
  background: var(--cd-accent-soft);
}

.cd-text { min-width: 0; padding-top: 2px; }
.cd-title { margin: 0; font-size: 17px; font-weight: 600; line-height: 1.4; color: var(--cd-title); }
.cd-description { margin: 6px 0 0; font-size: 14px; line-height: 1.6; color: var(--cd-text); }

.cd-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }

.cd-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 88px;
  height: 40px;
  padding: 0 18px;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  border-radius: 10px;
  cursor: pointer;
  transition: background 120ms, box-shadow 120ms, transform 80ms;
}
.cd-btn:active:not(:disabled) { transform: scale(0.97); }
.cd-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.cd-btn:focus-visible { outline: 2px solid var(--cd-accent); outline-offset: 2px; }

.cd-btn-secondary {
  color: var(--cd-title);
  background: var(--cd-secondary-bg);
  border: 1px solid var(--cd-border);
}
.cd-btn-secondary:hover:not(:disabled) { background: var(--cd-secondary-hover); }

.cd-btn-primary {
  color: #fff;
  background: var(--cd-accent);
  border: 1px solid transparent;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}
.cd-btn-primary:hover:not(:disabled) { background: var(--cd-accent-hover); }

.cd-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: cd-spin 700ms linear infinite;
}

.cd-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  color: var(--cd-text);
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 120ms, color 120ms;
}
.cd-close:hover:not(:disabled) { background: var(--cd-secondary-hover); color: var(--cd-title); }
.cd-close:disabled { opacity: 0.4; cursor: not-allowed; }
.cd-close:focus-visible { outline: 2px solid var(--cd-accent); }

@keyframes cd-fade-in  { from { opacity: 0 } to { opacity: 1 } }
@keyframes cd-fade-out { from { opacity: 1 } to { opacity: 0 } }
@keyframes cd-pop-in   { from { opacity: 0; transform: translate(-50%, -48%) scale(0.96) } to { opacity: 1; transform: translate(-50%, -50%) scale(1) } }
@keyframes cd-pop-out  { from { opacity: 1; transform: translate(-50%, -50%) scale(1) } to { opacity: 0; transform: translate(-50%, -48%) scale(0.96) } }
@keyframes cd-spin     { to { transform: rotate(360deg) } }

@media (prefers-reduced-motion: reduce) {
  .cd-overlay, .cd-content, .cd-spinner { animation-duration: 1ms; }
}

@media (max-width: 480px) {
  .cd-footer { flex-direction: column-reverse; }
  .cd-btn { width: 100%; }
}
`