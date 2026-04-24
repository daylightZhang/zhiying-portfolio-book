import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Briefcase, History } from 'lucide-react'
import ThemeSwitcher from './ThemeSwitcher'
import type { ThemeId } from '../../hooks/useTheme'

const links = [
  { to: '/', icon: LayoutDashboard, label: '总览' },
  { to: '/holdings', icon: Briefcase, label: '持仓' },
  { to: '/history', icon: History, label: '记录' },
]

interface Props {
  theme: ThemeId
  onThemeChange: (id: ThemeId) => void
}

export default function Sidebar({ theme, onThemeChange }: Props) {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-full w-56 flex-col border-r border-border bg-bg-card/80 glass">
      <div className="flex items-center gap-3 px-5 py-5">
        <img src="/logo.png" alt="知盈" className="h-9 w-9 rounded-lg" />
        <div>
          <h1 className="text-lg font-bold text-t-primary">知盈</h1>
          <p className="text-[11px] text-t-faint">投资账本</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 px-3">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors mb-1 ${
                isActive
                  ? 'bg-accent-bg text-accent'
                  : 'text-t-muted hover:bg-bg-hover hover:text-t-secondary'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border-subtle px-3 py-3">
        <ThemeSwitcher current={theme} onChange={onThemeChange} />
      </div>
    </aside>
  )
}
