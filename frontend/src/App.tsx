import { Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import DashboardPage from './pages/DashboardPage'
import HoldingsPage from './pages/HoldingsPage'
import HistoryPage from './pages/HistoryPage'
import { AccountContext, useAccountState } from './hooks/useAccount'

function App() {
  const accountState = useAccountState()

  return (
    <AccountContext.Provider value={accountState}>
      <AppLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/holdings" element={<HoldingsPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </AppLayout>
    </AccountContext.Provider>
  )
}

export default App
