import { formatDateTime } from '../../../lib/utils'
import type { MemoryListItem } from '../types'

interface MemoryListItemCardProps {
  item: MemoryListItem
  onOpen: (id: string) => void
}

export function MemoryListItemCard({ item, onOpen }: MemoryListItemCardProps) {
  return (
    <button key={item.id} className="memory-card" onClick={() => onOpen(item.id)}>
      <div className="memory-date">{formatDateTime(item.recordedAt || item.createdAt)}</div>
      <div className="memory-snippet">
        {item.transcriptSnippet || (item.status === 'FAILED' ? 'Transcription failed. Open for details.' : 'Processing...')}
      </div>
    </button>
  )
}
