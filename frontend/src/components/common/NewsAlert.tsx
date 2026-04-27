import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Newspaper, X } from 'lucide-react'
import { useFlashNews } from '../../hooks/useNews'

const DISMISS_SECONDS = 8

export default function NewsAlert() {
  const { data: items } = useFlashNews()
  const navigate = useNavigate()
  const location = useLocation()
  const [alert, setAlert] = useState<{ id: string; full: string; short: string } | null>(null)
  const [hovered, setHovered] = useState(false)
  const lastSeenId = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const startDismissTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setAlert(null), DISMISS_SECONDS * 1000)
  }

  useEffect(() => {
    if (!items || items.length === 0) return
    const newest = items[0]
    if (location.pathname === '/news') return
    if (lastSeenId.current === null) {
      lastSeenId.current = newest.id
      return
    }
    if (newest.id === lastSeenId.current) return

    lastSeenId.current = newest.id
    const content = newest.data.content || newest.data.name || ''
    if (!content) return

    const text = content.replace(/<[^>]*>/g, '')
    setAlert({
      id: newest.id,
      full: text,
      short: text.length > 80 ? text.slice(0, 80) + '...' : text,
    })
    setHovered(false)
    startDismissTimer()
  }, [items, location.pathname])

  // Pause/resume timer on hover
  useEffect(() => {
    if (!alert) return
    if (hovered) {
      if (timerRef.current) clearTimeout(timerRef.current)
    } else {
      startDismissTimer()
    }
  }, [hovered])

  if (!alert) return null

  return (
    <div
      onClick={() => { setAlert(null); navigate('/news') }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 rounded-xl bg-bg-card/95 border border-accent/30 px-4 py-3 shadow-xl glass animate-slideUp cursor-pointer hover:border-accent/60 transition-all ${hovered ? 'max-w-2xl' : 'max-w-lg'}`}
    >
      <Newspaper size={16} className="text-accent shrink-0" />
      <span className={`text-sm text-t-primary ${hovered ? '' : 'line-clamp-1'}`}>
        {hovered ? alert.full : alert.short}
      </span>
      <button
        onClick={e => { e.stopPropagation(); setAlert(null) }}
        className="text-t-faint hover:text-t-secondary shrink-0 ml-1"
      >
        <X size={14} />
      </button>
    </div>
  )
}
