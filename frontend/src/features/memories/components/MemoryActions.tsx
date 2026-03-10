import { OverflowMenu, type OverflowMenuAction } from '../../../components/OverflowMenu'

interface MemoryActionsProps {
  canManageMemory: boolean
  actions: OverflowMenuAction[]
  disabled: boolean
}

export function MemoryActions({ canManageMemory, actions, disabled }: MemoryActionsProps) {
  if (!canManageMemory) {
    return null
  }

  return <OverflowMenu actions={actions} ariaLabel="More actions" disabled={disabled} />
}
