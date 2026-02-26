import type { ReactNode } from 'react'
import { RouteNotFound } from '../components/RouteNotFound'
import { TopNav } from '../components/TopNav'
import { MemoriesPage } from '../pages/MemoriesPage'
import { MemoryDetailPage } from '../pages/MemoryDetailPage'
import { RecordPage } from '../pages/RecordPage'
import { useAppRouter } from './router'

export default function App() {
  const { pathname, route, navigate } = useAppRouter()

  let content: ReactNode
  if (route.kind === 'record') {
    content = <RecordPage navigate={navigate} />
  } else if (route.kind === 'memories') {
    content = <MemoriesPage navigate={navigate} />
  } else if (route.kind === 'memory-detail') {
    content = <MemoryDetailPage memoryId={route.memoryId} navigate={navigate} />
  } else {
    content = <RouteNotFound navigate={navigate} />
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-title">Little Moments</div>
        <TopNav pathname={pathname} navigate={navigate} />
      </header>
      <div className="content">{content}</div>
    </div>
  )
}
