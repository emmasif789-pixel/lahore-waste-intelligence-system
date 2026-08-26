// Fallback "Demo AI Model": a genuine (if simple) color/texture heuristic run
// entirely in-browser on the actual uploaded photo. It is NOT a placeholder
// random generator — pixel content changes the output — but it is not a
// trained vision model either. Every result produced by this path is labeled
// "Demo AI Model" in the UI so it's never confused with the real vision
// endpoint (src/lib/analyzeWaste.js calls /api/analyze first, which uses a
// real vision-capable model when GROQ_API_KEY is configured server-side).

function bucketColor(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const brightness = (r + g + b) / 3
  const sat = max === 0 ? 0 : (max - min) / max

  if (brightness < 45) return 'dark' // charred / hazardous-looking / tires
  if (g > r * 1.08 && g > b * 1.08 && brightness < 160) return 'organic' // greenish/brown vegetation
  if (r > 130 && g > 90 && g < 170 && b < 110 && r > g) return 'cardboard' // brown/tan
  if (brightness > 195 && sat < 0.15) return 'plastic_light' // white/light plastic, foam
  if (b > r && b > g && brightness > 90) return 'plastic_blue'
  if (sat < 0.1 && brightness > 120 && brightness < 200) return 'metal'
  return 'mixed'
}

export async function heuristicAnalyze(imageEl, { lat, lng } = {}) {
  const canvas = document.createElement('canvas')
  const w = (canvas.width = 96)
  const h = (canvas.height = 96)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(imageEl, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)

  const counts = { dark: 0, organic: 0, cardboard: 0, plastic_light: 0, plastic_blue: 0, metal: 0, mixed: 0 }
  let total = 0
  for (let i = 0; i < data.length; i += 4 * 3) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    counts[bucketColor(r, g, b)]++
    total++
  }

  const pct = (k) => Math.round((counts[k] / total) * 100)

  const organicPct = pct('organic')
  const cardboardPct = pct('cardboard')
  const plasticPct = pct('plastic_light') + pct('plastic_blue')
  const metalPct = pct('metal')
  const darkPct = pct('dark')
  const mixedPct = Math.max(0, 100 - organicPct - cardboardPct - plasticPct - metalPct - darkPct)

  const categories = [
    { type: 'Organic', pct: organicPct },
    { type: 'Plastic', pct: plasticPct },
    { type: 'Cardboard', pct: cardboardPct },
    { type: 'Metal', pct: metalPct },
    { type: 'Mixed/Residual', pct: mixedPct + darkPct },
  ]
    .filter((c) => c.pct > 0)
    .sort((a, b) => b.pct - a.pct)

  const hazardIndicators = []
  if (darkPct > 22) hazardIndicators.push('Possible charring / burnt residue detected')
  if (metalPct > 15) hazardIndicators.push('Sharp metal fragments possible — handle with care')

  const recoverablePct = Math.min(75, plasticPct + cardboardPct + metalPct + Math.round(organicPct * 0.3))

  let severity = 'low'
  if (darkPct > 25 || recoverablePct < 15) severity = 'high'
  else if (mixedPct > 45 || darkPct > 12) severity = 'moderate'
  if (darkPct > 35) severity = 'critical'

  return {
    source: 'heuristic',
    confidence: 0.42, // deliberately modest — this is a color heuristic, not a trained model
    categories,
    severity,
    recyclableMaterials: categories.filter((c) => ['Plastic', 'Cardboard', 'Metal'].includes(c.type)).map((c) => c.type),
    recoverablePct,
    hazardIndicators,
    environmentalRisk:
      darkPct > 25
        ? 'Elevated — signs consistent with open burning, which degrades local air quality.'
        : mixedPct > 40
        ? 'Moderate — high mixed/residual share complicates sorting and recovery.'
        : 'Low to moderate — composition suggests manageable standard collection.',
    recommendedActionHint:
      recoverablePct >= 45 ? 'recovery' : darkPct > 25 ? 'hazard' : 'priority_collection',
  }
}
