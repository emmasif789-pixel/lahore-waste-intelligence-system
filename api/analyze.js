// Vercel serverless function. Calls Groq's vision-capable Qwen model to
// classify an uploaded waste photo into structured JSON. Requires at least
// one GROQ_*KEY* environment variable set on the Vercel project. If none of
// them work, returns 501 so the client falls back to the in-browser
// heuristic model — the app works either way, but this path is the "real"
// one for the demo.
//
// Model: qwen/qwen3.6-27b — Groq's vision model as of the current
// deprecation schedule (console.groq.com/docs/deprecations). Groq rotates
// model availability; if this starts returning model-not-found errors,
// check that page for the current recommended vision model.
//
// Multiple keys: if you're hitting Groq's free-tier rate limit during a
// demo, add more than one key on Vercel. Every env var whose name contains
// "GROQ" and "KEY" is tried in order; on a rate-limit/quota/auth error it
// moves to the next key automatically. This is failover, not load
// balancing — Vercel functions are stateless per request, so there's no
// way to track "which key is under less load" without external infra
// (e.g. Redis), which isn't worth building for this.

import { getGroqKeys, isKeyLevelFailure } from './_groqKeys.js'

export const config = { runtime: 'nodejs' }

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

async function callGroq(apiKey, image, mediaType) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'qwen/qwen3.6-27b',
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
  return response
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
  for (let i = 0; i < keys.length; i++) {
    const { name, value } = keys[i]
    try {
      const response = await callGroq(value, image, mediaType)

      if (!response.ok) {
        const errText = await response.text()
        lastError = { key: name, status: response.status, detail: errText }
        if (isKeyLevelFailure(response.status) && i < keys.length - 1) {
          continue // try next key
        }
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
      lastError = { key: name, detail: String(err) }
      if (i < keys.length - 1) continue // network blip — try next key
      res.status(500).json({ error: 'Analysis failed', detail: String(err) })
      return
    }
  }

  // All keys exhausted
  res.status(502).json({ error: 'All Groq keys failed', detail: lastError })
}
