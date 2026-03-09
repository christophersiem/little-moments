import { resolveEnsureDisplayName } from './api'

function test(name: string, fn: () => void): void {
  try {
    fn()
    // eslint-disable-next-line no-console
    console.log(`PASS ${name}`)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`FAIL ${name}`)
    throw error
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

test('resolveEnsureDisplayName prefers explicit value', () => {
  const actual = resolveEnsureDisplayName('  New Name  ', 'Old Pending')
  assert(actual === 'New Name', `Expected "New Name", received "${actual}"`)
})

test('resolveEnsureDisplayName uses pending value when explicit is empty', () => {
  const actual = resolveEnsureDisplayName('   ', '  Pending Name ')
  assert(actual === 'Pending Name', `Expected "Pending Name", received "${actual}"`)
})

test('resolveEnsureDisplayName returns null when no value is provided', () => {
  const actual = resolveEnsureDisplayName(undefined, null)
  assert(actual === null, `Expected null, received "${String(actual)}"`)
})

