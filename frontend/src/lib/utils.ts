export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) {
    return ''
  }

  return new Date(isoString).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
