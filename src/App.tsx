import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Dashboard } from './pages/Dashboard'
import { NewEntry } from './pages/NewEntry'
import { StudyPlanner } from './pages/StudyPlanner'
import { CalendarView } from './pages/CalendarView'
import { Settings } from './pages/Settings'
import { useStore } from './hooks/useStore'

export default function App() {
  const storeCtx = useStore()
  if (storeCtx.loading) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-base)', flexDirection:'column', gap:16 }}>
      <div className="spinner" /><span style={{ color:'var(--text-muted)', fontSize:13 }}>Lädt…</span>
    </div>
  )
  return (
    <ErrorBoundary>
      <HashRouter>
        <Layout store={storeCtx}>
          <Routes>
            <Route path="/"          element={<Dashboard    store={storeCtx} />} />
            <Route path="/new"       element={<NewEntry     store={storeCtx} />} />
            <Route path="/planner"   element={<StudyPlanner store={storeCtx} />} />
            <Route path="/calendar"  element={<CalendarView store={storeCtx} />} />
            <Route path="/settings"  element={<Settings     store={storeCtx} />} />
            <Route path="*"          element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </ErrorBoundary>
  )
}
