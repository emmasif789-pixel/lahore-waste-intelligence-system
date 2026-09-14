// Vercel serverless function backing "Ask a question" in City Intelligence.
// Takes a free-text question plus a compact summary of the current
// hotspot data (built client-side, not fetched here) and asks Groq's text
// model to answer using only that data. Returns 501 if no key is
// configured so the client can show an honest "AI question answering
// isn't available" state instead of pretending to answer.
//
// Models: tries TEXT_MODELS in order, moving on automatically if Groq
// reports a model as decommissioned — see the matching comment in
// api/analyze.js for why, and update this list from
// console.groq.com/docs/deprecations if all of them ever die at once.

import { getGroqKeys, isKeyLevelFailure, isModelDeadError } from './_groqKeys.js'

export const config = { runtime: 'nodejs' }

const TEXT_MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.6-27b']

const SYSTEM_PROMPT = `You are the City Intelligence assistant for the Lahore Waste Intelligence System, a municipal waste-hotspot tracking tool. You will be given a compact data summary of the current tracked hotspots and asked a question by a city operations user.

Rules:
- Answer using ONLY the data summary provided. Do not invent locations, statistics, or facts not present in it.
- If the data summary doesn't contain enough to answer, say so plainly instead of guessing.
- Keep answers short and operational — 2-4 sentences, like a briefing to a city ops lead, not an essay.
- No markdown formatting, no headers, plain sentences.`

async function callGroq(apiKey, model, question, context) {
  return fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
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
  for (const model of TEXT_MODELS) {
    for (const { name, value } of keys) {
      try {
        const response = await callGroq(value, model, question.trim(), context || 'No data available.')

        if (!response.ok) {
          const errText = await response.text()
          lastError = { key: name, model, status: response.status, detail: errText }

          if (isModelDeadError(errText)) {
            break // this model is gone — try the next model instead of every remaining key
          }
          if (isKeyLevelFailure(response.status)) {
            continue // try the next key with this same model
          }
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
        lastError = { key: name, model, detail: String(err) }
        continue
      }
    }
  }

  res.status(502).json({ error: 'All Groq models/keys failed', detail: lastError })
}
