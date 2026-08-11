import type { ReactNode } from 'react'
import { BriefcaseBusiness, ClipboardCheck, FileSearch, FileText, LayoutDashboard, Settings2 } from 'lucide-react'

import { useWorkbenchStore, type WorkbenchView } from '../store/workbench-store'

const navigation: Array<{ id: WorkbenchView; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: '总览', icon: LayoutDashboard },
  { id: 'discover', label: '导入与发现', icon: FileSearch },
  { id: 'jobs', label: '岗位池', icon: BriefcaseBusiness },
  { id: 'review', label: '审核队列', icon: ClipboardCheck },
  { id: 'profile', label: '档案与证据', icon: FileText },
  { id: 'settings', label: 'AI 配置', icon: Settings2 },
]

export function AppShell({ children }: { children: ReactNode }) {
  const activeView = useWorkbenchStore((state) => state.activeView)
  const setActiveView = useWorkbenchStore((state) => state.setActiveView)
  const profile = useWorkbenchStore((state) => state.profile)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><BriefcaseBusiness size={19} /></div>
          <div><strong>求职工作台</strong><span>本地申请管理</span></div>
        </div>
        <nav aria-label="主要导航" className="side-nav">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <button
                aria-current={activeView === item.id ? 'page' : undefined}
                className={activeView === item.id ? 'nav-item active' : 'nav-item'}
                key={item.id}
                onClick={() => setActiveView(item.id)}
                type="button"
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="candidate-avatar">{profile.name.slice(0, 1)}</div>
          <div><strong>{profile.name}</strong><span>{profile.graduationYear} 届</span></div>
        </div>
      </aside>
      <main className="workspace">{children}</main>
    </div>
  )
}
