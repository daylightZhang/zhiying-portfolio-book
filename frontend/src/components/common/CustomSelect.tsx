import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  hint?: string
}

interface Props {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function CustomSelect({ options, value, onChange, placeholder = '请选择', className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-border bg-input-bg px-3 py-2 text-sm text-t-primary outline-none transition-all duration-200 hover:border-accent focus:border-accent"
      >
        <span className={selected ? '' : 'text-t-faint'}>{selected?.label || placeholder}</span>
        <ChevronDown size={14} className={`text-t-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border-subtle bg-bg-card/90 p-1 shadow-xl glass animate-slideUp max-h-60 overflow-y-auto">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${
                opt.value === value
                  ? 'bg-accent-bg text-accent'
                  : 'text-t-secondary hover:bg-bg-hover'
              }`}
            >
              <div>
                <span>{opt.label}</span>
                {opt.hint && <span className="ml-2 text-xs text-t-faint">{opt.hint}</span>}
              </div>
              {opt.value === value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
