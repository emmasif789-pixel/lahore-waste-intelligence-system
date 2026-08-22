// Vercel serverless function. Calls Anthropic's vision-capable API to
// classify an uploaded waste photo into structured JSON. Requires
// ANTHROPIC_API_KEY to be set as an environment variable on the Vercel
// project. If it's not set, returns 501 so the client falls back to the
// in-browser heuristic model — the app works either way, but this path is
// the "real" one for the demo.

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

// Uses Groq's OpenAI-compatible chat completions API with a vision-capable
// Llama model. Requires GROQ_API_KEY as a Vercel environment variable.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    res.status(501).json({ error: 'No GROQ_API_KEY configured — client should fall back to heuristic model.' })
    return
  }

  try {
    const { image, mediaType } = req.body

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
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

    if (!response.ok) {
      const errText = await response.text()
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
  } catch (err) {
    res.status(500).json({ error: 'Analysis failed', detail: String(err) })
  }
}
