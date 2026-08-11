import { AppShell } from './components/AppShell'
import { Dashboard } from './components/Dashboard'
import { Discover } from './components/Discover'
import { JobPool } from './components/JobPool'
import { Profile } from './components/Profile'
import { ProviderSettings } from './components/ProviderSettings'
import { ReviewQueue } from './components/ReviewQueue'
import { useWorkbenchStore } from './store/workbench-store'

export default function App() {
  const activeView = useWorkbenchStore((state) => state.activeView)

  return (
    <AppShell>
      {activeView === 'dashboard' && <Dashboard />}
      {activeView === 'discover' && <Discover />}
      {activeView === 'jobs' && <JobPool />}
      {activeView === 'review' && <ReviewQueue />}
      {activeView === 'profile' && <Profile />}
      {activeView === 'settings' && <ProviderSettings />}
    </AppShell>
  )
}
