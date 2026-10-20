import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'

export type EmployeeOption = { id: string; name: string; detail?: string }

type Props = {
  label: string
  value: string
  options: EmployeeOption[]
  onChange: (value: string) => void
}

export default function EmployeeSearchSelect({ label, value, options, onChange }: Props) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const selected = options.find((option) => option.id === value)
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    return normalized
      ? options.filter((option) => `${option.name} ${option.detail ?? ''}`.toLocaleLowerCase().includes(normalized))
      : options
  }, [options, query])

  useEffect(() => {
    if (!open) setQuery(selected?.name ?? '')
  }, [open, selected?.name])

  const choose = (option: EmployeeOption) => {
    onChange(option.id)
    setQuery(option.name)
    setOpen(false)
    setActiveIndex(0)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => index < 0 ? 0 : Math.min(index + 1, Math.max(filtered.length - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => index < 0 ? Math.max(filtered.length - 1, 0) : Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && open && filtered[activeIndex]) {
      event.preventDefault()
      choose(filtered[activeIndex])
    } else if (event.key === 'Escape') {
      setOpen(false)
      setQuery(selected?.name ?? '')
      inputRef.current?.blur()
    }
  }

  return <div className="employee-search-select">
    <label className="employee-search-select-label" htmlFor={`employee-search-${id}`}>{label}</label>
    <input
      ref={inputRef}
      id={`employee-search-${id}`}
      type="text"
      role="combobox"
      aria-autocomplete="list"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={`employee-options-${id}`}
      aria-activedescendant={open && filtered[activeIndex] ? `employee-option-${id}-${filtered[activeIndex].id}` : undefined}
      autoComplete="off"
      value={query}
      onFocus={() => { setQuery(''); setOpen(true); setActiveIndex(-1) }}
      onBlur={() => {
        window.setTimeout(() => {
          setOpen(false)
          setQuery(selected?.name ?? '')
        }, 100)
      }}
      onChange={(event) => { setQuery(event.target.value); setOpen(true); setActiveIndex(-1) }}
      onKeyDown={handleKeyDown}
    />
    {open && <div id={`employee-options-${id}`} className="employee-search-options" role="listbox" aria-label={label}>
      {filtered.length > 0 ? filtered.map((option, index) => <button
        type="button"
        key={option.id}
        id={`employee-option-${id}-${option.id}`}
        role="option"
        aria-selected={option.id === value}
        className={index === activeIndex ? 'is-active' : ''}
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => choose(option)}
      ><span>{option.name}</span>{option.detail && <small>{option.detail}</small>}</button>) : <span className="employee-search-empty">—</span>}
    </div>}
  </div>
}
