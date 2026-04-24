import { Palette } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { THEMES, type ThemeId } from '../../hooks/useTheme'

interface Props {
  current: ThemeId
  onChange: (id: ThemeId) => void
}

export default function ThemeSwitcher({ current, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-t-muted hover:bg-bg-hover hover:text-t-secondary transition-colors"
      >
        <Palette size={16} />
        <span>主题</span>
        <span className="ml-auto text-xs text-t-faint">
          {THEMES.find(t => t.id === current)?.label}
        </span>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-52 rounded-xl border border-border-subtle bg-bg-card/90 p-2 shadow-xl z-50 glass animate-slideUp">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => { onChange(t.id); setOpen(false) }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                current === t.id ? 'bg-accent-bg' : 'hover:bg-bg-hover'
              }`}
            >
              <div
                className="h-7 w-7 shrink-0 rounded-full border border-border-subtle"
                style={{ background: t.preview }}
              />
              <div>
                <div className={`text-sm font-medium ${current === t.id ? 'text-accent' : 'text-t-primary'}`}>
                  {t.label}
                </div>
                <div className="text-xs text-t-faint">{t.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
