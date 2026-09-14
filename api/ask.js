// Vercel serverless function backing "Ask a question" in City Intelligence.
// Takes a free-text question plus a compact summary of the current
// hotspot data (built client-side, not fetched here) and asks Groq's text
// model to answer using only that data. Same multi-key failover as
// api/analyze.js. Returns 501 if no key is configured so the client can
// show an honest "AI question answering isn't available" state instead of
// pretending to answer.
//
// Model: openai/gpt-oss-120b — Groq's current recommended replacement for
// the now-deprecated llama-3.3-70b-versatile (console.groq.com/docs/deprecations).

import { getGroqKeys, isKeyLevelFailure } from './_groqKeys.js'

export const config = { runtime: 'nodejs' }

const SYSTEM_PROMPT = `You are the City Intelligence assistant for the Lahore Waste Intelligence System, a municipal waste-hotspot tracking tool. You will be given a compact data summary of the current tracked hotspots and asked a question by a city operations user.

Rules:
- Answer using ONLY the data summary provided. Do not invent locations, statistics, or facts not present in it.
- If the data summary doesn't contain enough to answer, say so plainly instead of guessing.
- Keep answers short and operational — 2-4 sentences, like a briefing to a city ops lead, not an essay.
- No markdown formatting, no headers, plain sentences.`

async function callGroq(apiKey, question, context) {
  return fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      max_tokens: 400,
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `DATA SUMMARY:\n${context}\n\nQUESTION: ${question}` },
      ],
    }),
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { question, context } = req.body || {}
  if (!question || typeof question !== 'string' || !question.trim()) {
    res.status(400).json({ error: 'Missing question' })
    return
  }

  const keys = getGroqKeys()
  if (keys.length === 0) {
    res.status(501).json({ error: 'No GROQ_*KEY* env var configured.' })
    return
  }

  let lastError = null
  for (let i = 0; i < keys.length; i++) {
    const { name, value } = keys[i]
    try {
      const response = await callGroq(value, question.trim(), context || 'No data available.')

      if (!response.ok) {
        const errText = await response.text()
        lastError = { key: name, status: response.status, detail: errText }
        if (isKeyLevelFailure(response.status) && i < keys.length - 1) continue
        res.status(502).json({ error: 'Question answering failed', detail: errText })
        return
      }

      const data = await response.json()
      const answer = data.choices?.[0]?.message?.content?.trim()
      if (!answer) {
        res.status(502).json({ error: 'No text in model response' })
        return
      }

      res.status(200).json({ answer, source: 'model' })
      return
    } catch (err) {
      lastError = { key: name, detail: String(err) }
      if (i < keys.length - 1) continue
      res.status(500).json({ error: 'Question answering failed', detail: String(err) })
      return
    }
  }

  res.status(502).json({ error: 'All Groq keys failed', detail: lastError })
}
