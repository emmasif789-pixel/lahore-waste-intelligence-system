// Vercel serverless function. Calls Groq's vision-capable Qwen model to
// classify an uploaded waste photo into structured JSON. Requires at least
// one GROQ_*KEY* environment variable set on the Vercel project. If none of
// them work, returns 501 so the client falls back to the in-browser
// heuristic model — the app works either way, but this path is the "real"
// one for the demo.
//
// Models: tries VISION_MODELS in order. Groq deprecates/shuts down model
// IDs on a schedule (console.groq.com/docs/deprecations) — when that
// happens it returns a distinct "model_decommissioned"/"model_not_found"
// error code, which this detects and automatically moves to the next
// model in the list, instead of the whole feature silently going dead
// until someone notices and redeploys. If ALL models here end up
// decommissioned, add the current one from that page to the top of the
// list below.
//
// Multiple keys: if you're hitting Groq's free-tier rate limit during a
// demo, add more than one key on Vercel. Every env var whose name contains
// "GROQ" and "KEY" is tried in order; on a rate-limit/quota/auth error it
// moves to the next key automatically. This is failover, not load
// balancing — Vercel functions are stateless per request, so there's no
// way to track "which key is under less load" without external infra
// (e.g. Redis), which isn't worth building for this.

import { getGroqKeys, isKeyLevelFailure, isModelDeadError } from './_groqKeys.js'

export const config = { runtime: 'nodejs' }

const VISION_MODELS = ['qwen/qwen3.6-27b', 'qwen/qwen3.8-27b']

const SYSTEM_PROMPT = `You are a waste-composition vision analyst for a municipal waste intelligence system in Lahore, Pakistan. Given a photo of a waste/garbage site, respond with ONLY a JSON object (no markdown fences, no prose) with this exact shape:

{
  "categories": [{ "type": "Organic|Plastic|Metal|Cardboard|Glass|E-waste|Construction|Hazardous|Mixed/Residual", "pct": number }],
  "severity": "low|moderate|high|critical",
  "recyclableMaterials": [string],
  "recoverablePct": number,
  "hazardIndicators": [string],
  "environmentalRisk": string (one or two sentences),
  "confidence": number (0 to 1)
}

Category percentages should sum to approximately 100. Be conservative and evidence-based — only note hazard indicators (e.g. burning, medical waste, chemical containers) you can actually see signs of. This is an estimate from a photo, not a lab analysis. Respond with ONLY the JSON object, nothing else.`

async function callGroq(apiKey, model, image, mediaType) {
  return fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this waste photo and return the JSON described in the system prompt.' },
            { type: 'image_url', image_url: { url: `data:${mediaType || 'image/jpeg'};base64,${image}` } },
          ],
        },
      ],
    }),
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const keys = getGroqKeys()
  if (keys.length === 0) {
    res.status(501).json({ error: 'No GROQ_*KEY* env var configured — client should fall back to heuristic model.' })
    return
  }

  const { image, mediaType } = req.body

  let lastError = null
  for (const model of VISION_MODELS) {
    for (const { name, value } of keys) {
      try {
        const response = await callGroq(value, model, image, mediaType)

        if (!response.ok) {
          const errText = await response.text()
          lastError = { key: name, model, status: response.status, detail: errText }

          if (isModelDeadError(errText)) {
            break // this model is gone — no point trying the remaining keys with it
          }
          if (isKeyLevelFailure(response.status)) {
            continue // try the next key with this same model
          }
          // Not a key or model problem — a bad request would fail the same
          // way on every key/model, so stop instead of burning more calls.
          res.status(502).json({ error: 'Vision model request failed', detail: errText })
          return
        }

        const data = await response.json()
        const text = data.choices?.[0]?.message?.content
        if (!text) {
          res.status(502).json({ error: 'No text in model response' })
          return
        }

        const cleaned = text.replace(/```json|```/g, '').trim()
        const parsed = JSON.parse(cleaned)

        res.status(200).json({ source: 'model', ...parsed })
        return
      } catch (err) {
        lastError = { key: name, model, detail: String(err) }
        continue // network blip — try next key
      }
    }
  }

  // All models and keys exhausted
  res.status(502).json({ error: 'All Groq models/keys failed', detail: lastError })
}
