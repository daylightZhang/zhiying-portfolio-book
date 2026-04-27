import { Routes, Route } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import AppLayout from './components/layout/AppLayout'
import DashboardPage from './pages/DashboardPage'
import HoldingsPage from './pages/HoldingsPage'
import HistoryPage from './pages/HistoryPage'
import NewsPage from './pages/NewsPage'
import NewsAlert from './components/common/NewsAlert'
import { AccountContext, useAccountState } from './hooks/useAccount'
import { ToastContext, useToastState } from './hooks/useToast'

function App() {
  const accountState = useAccountState()
  const toastState = useToastState()

  return (
    <AccountContext.Provider value={accountState}>
      <ToastContext.Provider value={toastState}>
        <AppLayout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/holdings" element={<HoldingsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/news" element={<NewsPage />} />
          </Routes>
        </AppLayout>

        <NewsAlert />

        {toastState.toast && (
          <div className="fixed top-4 right-4 z-[100] flex items-center gap-2 rounded-xl bg-bg-card/95 border border-border-subtle px-4 py-3 shadow-xl glass animate-slideUp">
            {toastState.toast.type === 'success'
              ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              : <XCircle size={16} className="text-loss shrink-0" />
            }
            <span className="text-sm text-t-primary">{toastState.toast.message}</span>
          </div>
        )}
      </ToastContext.Provider>
    </AccountContext.Provider>
  )
}

export default App
