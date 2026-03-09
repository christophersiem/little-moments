const ACTIVE_FAMILY_KEY = 'lm_active_family_id'
const ACTIVE_CHILD_KEY = 'lm_active_child_id'
const CAN_RECORD_KEY = 'lm_can_record'
const PENDING_INVITE_KEY = 'lm_pending_invite_token'

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function read(key: string): string | null {
  if (!canUseStorage()) {
    return null
  }
  const value = window.localStorage.getItem(key)
  if (!value) {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function write(key: string, value: string): void {
  if (!canUseStorage()) {
    return
  }
  const normalized = value.trim()
  if (!normalized) {
    return
  }
  window.localStorage.setItem(key, normalized)
}

function remove(key: string): void {
  if (!canUseStorage()) {
    return
  }
  window.localStorage.removeItem(key)
}

export function getActiveFamilyId(): string | null {
  return read(ACTIVE_FAMILY_KEY)
}

export function setActiveFamilyId(value: string): void {
  write(ACTIVE_FAMILY_KEY, value)
}

export function clearActiveFamilyId(): void {
  remove(ACTIVE_FAMILY_KEY)
}

export function getActiveChildId(): string | null {
  return read(ACTIVE_CHILD_KEY)
}

export function setActiveChildId(value: string): void {
  write(ACTIVE_CHILD_KEY, value)
}

export function clearActiveChildId(): void {
  remove(ACTIVE_CHILD_KEY)
}

export function getCanRecord(): boolean | null {
  const value = read(CAN_RECORD_KEY)
  if (value === 'true') {
    return true
  }
  if (value === 'false') {
    return false
  }
  return null
}

export function setCanRecord(value: boolean): void {
  write(CAN_RECORD_KEY, value ? 'true' : 'false')
}

export function clearCanRecord(): void {
  remove(CAN_RECORD_KEY)
}

export function getPendingInviteToken(): string | null {
  return read(PENDING_INVITE_KEY)
}

export function setPendingInviteToken(value: string): void {
  write(PENDING_INVITE_KEY, value)
}

export function clearPendingInviteToken(): void {
  remove(PENDING_INVITE_KEY)
}
