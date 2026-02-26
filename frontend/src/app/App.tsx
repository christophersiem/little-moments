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
  padding: ${({ theme }) => `${theme.space.x3} ${theme.space.x3} calc(${theme.space.x3} + env(safe-area-inset-bottom, 0px))`};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x3};
`

const Header = styled.header`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space.x2};
  padding-top: ${({ theme }) => theme.space.x1};
`

const Title = styled.h1`
  margin: 0;
  font-size: 1.95rem;
  color: ${({ theme }) => theme.colors.textMuted};
  font-family: ${({ theme }) => theme.typography.headingFamily};
  font-weight: 500;
  letter-spacing: 0.02em;
`

const Divider = styled.div`
  width: 100%;
  height: 1px;
  background: ${({ theme }) => theme.colors.border};
`

const Content = styled.main`
  flex: 1;
  display: flex;
`

const Footer = styled.footer`
  margin-top: auto;
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
      <Header>
        <Title>Little Moments</Title>
        <Divider />
      </Header>
      <Content>{content}</Content>
      <Footer>
        <TopNav pathname={pathname} navigate={navigate} />
      </Footer>
    </Shell>
  )
}
