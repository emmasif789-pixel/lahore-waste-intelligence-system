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

const APP_KNOWLEDGE = `How to submit a report: tap "Report waste", allow location access (or place a pin manually on the map if GPS isn't available), then take a photo with the live camera — gallery uploads are accepted as a fallback but marked "Unverified". The photo is analyzed by a vision AI for waste type, severity, and hazards, then the report is added to the live map immediately, visible to everyone.

Priority score: a 0-10 score from six visible weighted factors — severity, recurrence, proximity to sensitive sites, waste-type risk, hazard/burning, and accumulation trend. It's not a black box; every input is shown.

Report trust labels: "GPS" vs "Manual" shows whether the location came from live device GPS or a manually placed pin. "Verified" vs "Unverified" shows whether the photo was a live camera capture (verified) or a gallery upload (unverified) — timestamp and coordinates are also burned directly into verified photos.

Area density layer (optional map overlay): shows population and waste-generation density per area, from PBS Census 2023 and the Urban Unit's 2025 SWM report — separate from citizen-reported hotspots, used to spot under-monitored areas.

City Dashboard: aggregate city-wide stats, a ranked "clean these first" list, and CSV export of the cleanup priority report.`

const SYSTEM_PROMPT = `You are the City Intelligence assistant for the Lahore Waste Intelligence System, a municipal waste-hotspot tracking tool. You answer two kinds of questions:

1. Questions about how the app/system works (how to report, what the priority score means, what verification labels mean, etc.) — answer these using the APP KNOWLEDGE below.
2. Questions about the current live data (specific sites, stats, priorities, trends) — answer these using ONLY the DATA SUMMARY provided. Never invent locations, statistics, or figures not present in it. If the data summary doesn't cover it, say so plainly instead of guessing.

Rules:
- Keep answers short and practical — 2-4 sentences, like a briefing, not an essay.
- No markdown formatting, no headers, plain sentences.
- If a question mixes both kinds, answer the how-it-works part from APP KNOWLEDGE and the data part from DATA SUMMARY, staying accurate to which is which.

APP KNOWLEDGE:
${APP_KNOWLEDGE}`

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
