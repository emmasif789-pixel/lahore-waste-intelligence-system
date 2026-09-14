// Shared across Groq-calling serverless functions. Collects every env var
// that looks like a Groq key (name contains "GROQ" and "KEY"), in a stable
// order, so adding another key on Vercel later just works with no code
// change. A status of 401/403/429 means that specific key is spent/broken
// — try the next one — anything else means the request itself is bad and
// would fail identically on every key.

export function getGroqKeys() {
  return Object.keys(process.env)
    .filter((k) => k.toUpperCase().includes('GROQ') && k.toUpperCase().includes('KEY'))
    .sort()
    .map((k) => ({ name: k, value: process.env[k] }))
    .filter((k) => k.value)
}

export function isKeyLevelFailure(status) {
  return status === 401 || status === 403 || status === 429
}
