import { Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import DashboardPage from './pages/DashboardPage'
import HoldingsPage from './pages/HoldingsPage'
import HistoryPage from './pages/HistoryPage'

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/holdings" element={<HoldingsPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </AppLayout>
  )
}

export default App
