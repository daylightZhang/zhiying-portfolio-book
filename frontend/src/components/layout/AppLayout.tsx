import { useState } from 'react'
import Sidebar from './Sidebar'
import MarketTicker from './MarketTicker'
import SettingsDialog from './SettingsDialog'
import { useTheme } from '../../hooks/useTheme'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const themeCtx = useTheme()
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="flex min-h-screen bg-bg-primary text-t-secondary">
      <Sidebar theme={themeCtx.theme} onThemeChange={themeCtx.setTheme} onOpenSettings={() => setShowSettings(true)} />
      <main className="ml-56 flex-1 p-6 pb-14">
        {children}
      </main>
      <MarketTicker />
      <SettingsDialog open={showSettings} onClose={() => setShowSettings(false)} theme={themeCtx.theme} onThemeChange={themeCtx.setTheme} />
    </div>
  )
}
