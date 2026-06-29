import { describe, expect, it } from 'vitest'

import { isProviderOfflineErrorMessage } from './provider-offline'

describe('isProviderOfflineErrorMessage', () => {
  it.each([
    'connect ECONNREFUSED 127.0.0.1:11434',
    'Connection refused while calling the local model',
    'Failed to connect to provider',
    'Ollama is not running',
    'Provider unavailable'
  ])('recognizes an unavailable local provider: %s', message => {
    expect(isProviderOfflineErrorMessage(message)).toBe(true)
  })

  it.each(['No inference provider configured', 'Model returned malformed output', 'Request timed out'])(
    'does not mislabel other errors as offline: %s',
    message => {
      expect(isProviderOfflineErrorMessage(message)).toBe(false)
    }
  )

  it('rejects empty values', () => {
    expect(isProviderOfflineErrorMessage('')).toBe(false)
    expect(isProviderOfflineErrorMessage(null)).toBe(false)
    expect(isProviderOfflineErrorMessage(undefined)).toBe(false)
  })
})
