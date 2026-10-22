import { useEffect, useMemo, useState } from 'react'

export type PickerOption = { id: number; name: string }

type Props = {
  options: PickerOption[]
  value: number[]
  onChange: (ids: number[]) => void
  title: string
  emptyText: string
  searchText: string
  selectAllText: string
  clearText: string
  doneText: string
  noResultText: string
  maxChips?: number
}

export function TargetPicker({
  options, value, onChange, title, emptyText, searchText, selectAllText, clearText, doneText, noResultText, maxChips = 3,
}: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const selected = useMemo(() => new Set(value), [value])
  const nameOf = (id: number) => options.find((o) => o.id === id)?.name ?? `#${id}`
  const shown = options.filter((o) => o.name.toLowerCase().includes(q.trim().toLowerCase()))

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open])

  const close = () => { setOpen(false); setQ('') }
  const toggle = (id: number) => onChange(selected.has(id) ? value.filter((v) => v !== id) : [...value, id])
  const selectShown = () => onChange([...new Set([...value, ...shown.map((o) => o.id)])])

  return (
    <div className="tp">
      <button type="button" className="tp-trigger" onClick={() => setOpen(true)} aria-haspopup="dialog">
        {value.length === 0
          ? <span className="tp-placeholder">{emptyText}</span>
          : <span className="tp-chips">
              {value.slice(0, maxChips).map((id) => <span key={id} className="tp-chip">{nameOf(id)}</span>)}
              {value.length > maxChips && <span className="tp-chip tp-chip--more">+{value.length - maxChips}</span>}
            </span>}
        <span className="tp-caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="tp-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}>
          <div className="tp-sheet" role="dialog" aria-modal="true" aria-label={title}>
            <div className="tp-sheet-head">
              <b>{title}</b>
              <button type="button" className="tp-close" aria-label={doneText} onClick={close}>✕</button>
            </div>
            <input
              className="tp-search" type="search" inputMode="search" value={q}
              placeholder={searchText} onChange={(e) => setQ(e.target.value)}
            />
            <div className="tp-bulk">
              <button type="button" onClick={selectShown}>{selectAllText}</button>
              <button type="button" onClick={() => onChange([])} disabled={!value.length}>{clearText}</button>
              <span className="tp-count">{value.length}/{options.length}</span>
            </div>
            <ul className="tp-list">
              {shown.map((o) => (
                <li key={o.id}>
                  <label className={`tp-row${selected.has(o.id) ? ' is-on' : ''}`}>
                    <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggle(o.id)} />
                    <span>{o.name}</span>
                  </label>
                </li>
              ))}
              {shown.length === 0 && <li className="tp-empty">{noResultText}</li>}
            </ul>
            <div className="tp-foot">
              <button type="button" className="tp-done" onClick={close}>{doneText} ({value.length})</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}