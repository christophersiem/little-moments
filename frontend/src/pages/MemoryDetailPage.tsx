import { useMemoryDetail } from '../features/memories/hooks'
import { formatDateTime } from '../lib/utils'

interface MemoryDetailPageProps {
  memoryId: string
  navigate: (nextPath: string) => void
}

export function MemoryDetailPage({ memoryId, navigate }: MemoryDetailPageProps) {
  const { loading, error, memory } = useMemoryDetail(memoryId)

  if (loading) {
    return (
      <section className="panel panel-center">
        <h1>Memory</h1>
        <p>Loading...</p>
      </section>
    )
  }

  if (error || !memory) {
    return (
      <section className="panel">
        <h1>Memory</h1>
        <p className="error">{error || 'Could not load memory.'}</p>
        <button className="button" onClick={() => navigate('/memories')}>
          Back to List
        </button>
      </section>
    )
  }

  return (
    <section className="panel">
      <h1>Memory</h1>
      <p className="memory-date">{formatDateTime(memory.recordedAt || memory.createdAt)}</p>
      <div className="detail-status">Status: {memory.status}</div>
      {memory.status === 'FAILED' ? (
        <p className="error">{memory.errorMessage || 'Transcription failed.'}</p>
      ) : (
        <p className="detail-transcript">{memory.transcript || 'Transcription still processing.'}</p>
      )}
      <button className="button" onClick={() => navigate('/memories')}>
        Back to List
      </button>
    </section>
  )
}
