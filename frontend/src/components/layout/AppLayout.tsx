import Sidebar from './Sidebar'
import MarketTicker from './MarketTicker'
import { useTheme } from '../../hooks/useTheme'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const themeCtx = useTheme()

  return (
    <div className="flex min-h-screen bg-bg-primary text-t-secondary">
      <Sidebar theme={themeCtx.theme} onThemeChange={themeCtx.setTheme} />
      <main className="ml-56 flex-1 p-6 pb-14">
        {children}
      </main>
      <MarketTicker />
    </div>
  )
}
