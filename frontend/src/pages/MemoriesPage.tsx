import { MemoryListItemCard } from '../features/memories/components/MemoryListItemCard'
import { useMemoriesList } from '../features/memories/hooks'

interface MemoriesPageProps {
  navigate: (nextPath: string) => void
}

export function MemoriesPage({ navigate }: MemoriesPageProps) {
  const { loading, error, items } = useMemoriesList()

  if (loading) {
    return (
      <section className="panel panel-center">
        <h1>Memories</h1>
        <p>Loading...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="panel">
        <h1>Memories</h1>
        <p className="error">{error}</p>
      </section>
    )
  }

  return (
    <section className="panel">
      <h1>Memories</h1>
      {items.length === 0 ? (
        <p>No memories yet. Record your first one.</p>
      ) : (
        <div className="list">
          {items.map((item) => (
            <MemoryListItemCard key={item.id} item={item} onOpen={(id) => navigate(`/memories/${id}`)} />
          ))}
        </div>
      )}
    </section>
  )
}
