import { heuristicAnalyze } from './heuristicAI'

// Tries the real server-side vision model first (/api/analyze, which uses
// Groq's vision-capable Llama model when GROQ_API_KEY is set in the Vercel project).
// If that's not configured or the request fails, falls back to the in-browser
// heuristic so the demo is never dead in the water without a key.
export async function analyzeWastePhoto(file, imageEl, coords) {
  try {
    const base64 = await fileToBase64(file)
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, mediaType: file.type, lat: coords?.lat, lng: coords?.lng }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data && data.source === 'model') return data
    }
  } catch (e) {
    // fall through to heuristic
  }
  return heuristicAnalyze(imageEl, coords)
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
