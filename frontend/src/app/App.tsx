import type { ReactNode } from 'react'
import styled from 'styled-components'
import { RouteNotFound } from '../components/RouteNotFound'
import { TopNav } from '../components/TopNav'
import { MemoriesPage } from '../pages/MemoriesPage'
import { MemoryDetailPage } from '../pages/MemoryDetailPage'
import { RecordPage } from '../pages/RecordPage'
import { useAppRouter } from './router'

const Shell = styled.div`
  max-width: ${({ theme }) => theme.layout.maxWidth};
  margin: 0 auto;
  min-height: 100vh;
  padding: ${({ theme }) => theme.space.x4};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x5};

  @media (max-width: 640px) {
    padding: ${({ theme }) => theme.space.x3};
  }
`

const TopBar = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.space.x3};
  padding: ${({ theme }) => `${theme.space.x2} 0`};

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
  }
`

const Title = styled.div`
  font-family: ${({ theme }) => theme.typography.headingFamily};
  font-size: ${({ theme }) => theme.typography.h1Size};
  font-weight: 600;
  letter-spacing: 0.02em;
`

const Content = styled.main`
  flex: 1;
  display: flex;
`

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
    <Shell>
      <TopBar>
        <Title>Little Moments</Title>
        <TopNav pathname={pathname} navigate={navigate} />
      </TopBar>
      <Content>{content}</Content>
    </Shell>
  )
}
