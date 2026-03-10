import { MemoryListItemCard } from './MemoryListItemCard'
import type { MemoryListItem as MemoryListItemModel } from '../types'

interface MemoryListItemProps {
  item: MemoryListItemModel
  isLastInGroup: boolean
  onOpen: (id: string) => void
  onToggleHighlight: (id: string, nextValue: boolean) => void
  highlightBusy: boolean
}

export function MemoryListItem({ item, isLastInGroup, onOpen, onToggleHighlight, highlightBusy }: MemoryListItemProps) {
  return (
    <MemoryListItemCard
      item={item}
      isLastInGroup={isLastInGroup}
      onOpen={onOpen}
      onToggleHighlight={onToggleHighlight}
      highlightBusy={highlightBusy}
    />
  )
}
