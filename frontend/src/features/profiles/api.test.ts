import { describe, expect, it } from 'vitest'
import { resolveEnsureDisplayName } from './api'

describe('profiles api helpers', () => {
  it('resolveEnsureDisplayName prefers explicit value', () => {
    expect(resolveEnsureDisplayName('  New Name  ', 'Old Pending')).toBe('New Name')
  })

  it('resolveEnsureDisplayName uses pending value when explicit is empty', () => {
    expect(resolveEnsureDisplayName('   ', '  Pending Name ')).toBe('Pending Name')
  })

  it('resolveEnsureDisplayName returns null when no value is provided', () => {
    expect(resolveEnsureDisplayName(undefined, null)).toBeNull()
  })
})
