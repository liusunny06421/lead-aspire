// Generates illustrative state-level layers for the US gap map.
// underserved: share of households unbanked or underbanked (%)
// reach: Mastercard active cards per 100 adults (index)
// gap: underserved households Mastercard isn't reaching (0-100 index)
import { readFileSync, writeFileSync } from 'node:fs'

const topo = JSON.parse(readFileSync('node_modules/us-atlas/states-albers-10m.json', 'utf8'))
const states = topo.objects.states.geometries.map((g) => ({ id: g.id, name: g.properties.name }))

// Pilot-relevant states get higher need and lower reach, per the pitch (TX border, rural Mountain West).
const FOCUS = { Texas: 0.95, 'New Mexico': 0.9, Mississippi: 0.85, Louisiana: 0.8, Montana: 0.75,
  Wyoming: 0.72, Idaho: 0.7, Arizona: 0.7, Alabama: 0.68, Arkansas: 0.66, 'South Dakota': 0.6 }

function noise(i, salt) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

const out = {}
states.forEach((s, i) => {
  const focus = FOCUS[s.name] ?? 0.25 + 0.3 * noise(i, 1)
  const underserved = Math.round((8 + 14 * focus + 3 * noise(i, 2)) * 10) / 10
  const reach = Math.round(78 - 34 * focus + 8 * noise(i, 3))
  const gap = Math.round(Math.min(100, Math.max(0, underserved * 4 * (1 - reach / 100) * 1.6)))
  out[s.id] = { name: s.name, underserved, reach, gap }
})
writeFileSync('src/data/state_gap.json', JSON.stringify(out, null, 2) + '\n')
const top = Object.values(out).sort((a, b) => b.gap - a.gap).slice(0, 8)
console.log(top.map((s) => `${s.name}: need ${s.underserved}% reach ${s.reach} gap ${s.gap}`).join('\n'))
