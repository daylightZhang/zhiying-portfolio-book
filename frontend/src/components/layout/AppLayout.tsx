import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import MarketTicker from './MarketTicker'
import SettingsDialog from './SettingsDialog'
import { useTheme } from '../../hooks/useTheme'

const COLLAPSED_KEY = 'zhiying_sidebar_collapsed'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const themeCtx = useTheme()
  const [showSettings, setShowSettings] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === 'true')

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, String(collapsed))
  }, [collapsed])

  return (
    <div className="flex min-h-screen bg-bg-primary text-t-secondary">
      <Sidebar
        theme={themeCtx.theme}
        onThemeChange={themeCtx.setTheme}
        onOpenSettings={() => setShowSettings(true)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
      />
      <main className={`flex-1 p-6 pb-14 transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-56'}`}>
        {children}
      </main>
      <MarketTicker />
      <SettingsDialog open={showSettings} onClose={() => setShowSettings(false)} theme={themeCtx.theme} onThemeChange={themeCtx.setTheme} />
    </div>
  )
}
