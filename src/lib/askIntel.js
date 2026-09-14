// Calls /api/ask (Groq text model) with a question and a compact summary
// of the current hotspot data, so City Intelligence can answer free-text
// questions grounded in real data instead of only a fixed FAQ list.
export async function askIntelQuestion(question, context) {
  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, context }),
    })
    const data = await res.json()
    if (res.ok && data?.answer) {
      return { answer: data.answer, ok: true }
    }
    return { answer: null, ok: false, error: data?.error || 'Request failed' }
  } catch (e) {
    return { answer: null, ok: false, error: String(e) }
  }
}
