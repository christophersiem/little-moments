import { APP_ROUTES } from './routes'

export type BottomNavigationIcon = 'memories' | 'record' | 'settings'

export interface BottomNavigationItem {
  label: string
  route: string
  icon: BottomNavigationIcon
}

export const BOTTOM_NAVIGATION_ITEMS: readonly BottomNavigationItem[] = [
  {
    label: 'Memories',
    route: APP_ROUTES.memories,
    icon: 'memories',
  },
  {
    label: 'Record',
    route: APP_ROUTES.record,
    icon: 'record',
  },
  {
    label: 'Settings',
    route: APP_ROUTES.settings,
    icon: 'settings',
  },
]
