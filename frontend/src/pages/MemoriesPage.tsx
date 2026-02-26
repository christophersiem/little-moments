import styled from 'styled-components'
import { Card } from '../components/Card'
import { MemoryListItemCard } from '../features/memories/components/MemoryListItemCard'
import { useMemoriesList } from '../features/memories/hooks'

interface MemoriesPageProps {
  navigate: (nextPath: string) => void
}

const CenterCard = styled(Card)`
  align-items: center;
  justify-content: center;
  text-align: center;
`

const ErrorText = styled.p`
  color: ${({ theme }) => theme.colors.danger};
`

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.x3};
`

const EmptyText = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
`

export function MemoriesPage({ navigate }: MemoriesPageProps) {
  const { loading, error, items } = useMemoriesList()

  if (loading) {
    return (
      <CenterCard centered>
        <h1>Memories</h1>
        <p>Loading...</p>
      </CenterCard>
    )
  }

  if (error) {
    return (
      <Card>
        <h1>Memories</h1>
        <ErrorText>{error}</ErrorText>
      </Card>
    )
  }

  return (
    <Card>
      <h1>Memories</h1>
      {items.length === 0 ? (
        <EmptyText>No memories yet. Record your first one.</EmptyText>
      ) : (
        <List>
          {items.map((item) => (
            <MemoryListItemCard key={item.id} item={item} onOpen={(id) => navigate(`/memories/${id}`)} />
          ))}
        </List>
      )}
    </Card>
  )
}
