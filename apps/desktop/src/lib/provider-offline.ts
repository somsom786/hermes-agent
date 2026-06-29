const PROVIDER_OFFLINE_PATTERNS = [
  /\bECONNREFUSED\b/i,
  /\bconnection refused\b/i,
  /\bfailed to connect\b/i,
  /\bcould not connect\b/i,
  /\bprovider (?:is )?(?:offline|unavailable|unreachable)\b/i,
  /\bOllama\b.*\b(?:offline|unavailable|unreachable|not running)\b/i,
  /\b(?:offline|unavailable|unreachable)\b.*\bOllama\b/i
]

export function isProviderOfflineErrorMessage(message: null | string | undefined): boolean {
  const text = message?.trim()

  return Boolean(text && PROVIDER_OFFLINE_PATTERNS.some(pattern => pattern.test(text)))
}
