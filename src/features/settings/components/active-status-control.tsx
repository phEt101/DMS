export function ActiveStatusControl({
  active,
  statusLabel,
  activeLabel,
  inactiveLabel,
  onChange,
  disabled = false,
}: {
  active: boolean
  statusLabel: string
  activeLabel: string
  inactiveLabel: string
  onChange: (active: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="active-status-setting">
      <div>
        <strong>{statusLabel}</strong>
        <span className={`status-pill ${active ? "is-active" : ""}`}>
          {active ? activeLabel : inactiveLabel}
        </span>
      </div>
      <label className="active-status-switch">
        <input
          type="checkbox"
          role="switch"
          aria-label={`${statusLabel}: ${active ? activeLabel : inactiveLabel}`}
          checked={active}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span aria-hidden="true" />
      </label>
    </div>
  )
}