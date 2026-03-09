export const APP_ROUTES = {
  root: '/',
  onboarding: '/onboarding',
  record: '/record',
  memories: '/memories',
  inviteAccept: '/invite/accept',
  settings: '/settings',
  settingsFamily: '/settings/family',
  settingsAccount: '/settings/account',
  settingsPrivacy: '/settings/privacy',
} as const

export function toMemoryDetailPath(memoryId: string): string {
  return `${APP_ROUTES.memories}/${memoryId}`
}
