import { formatDateTime } from '../../../lib/utils'

export function formatMemoryDate(isoValue: string | null | undefined): string {
  return formatDateTime(isoValue)
}

function toDateTimeLocalValue(isoValue: string): string {
  const date = new Date(isoValue)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hour}:${minute}`
}

export function splitMemoryDateTimeDraft(isoValue: string): { date: string; time: string } {
  const local = toDateTimeLocalValue(isoValue)
  if (!local.includes('T')) {
    return { date: '', time: '' }
  }
  const [date, time] = local.split('T')
  return { date, time }
}

export function toIsoFromMemoryDateAndTime(dateValue: string, timeValue: string): string | null {
  const date = dateValue.trim()
  const time = timeValue.trim()
  if (!date || !time) {
    return null
  }
  const parsed = new Date(`${date}T${time}`)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed.toISOString()
}
