// Schematic hex map of the region. Each hex is an area; color is the model-estimated
// 90-day retention. Background hexes are synthetic and only give context; the shortlisted
// areas are the clickable ones.
const COLS = 13
const ROWS = 7
const R = 24
const W = Math.sqrt(3) * R

// Fixed hex positions for the candidate areas.
export const AREA_POSITIONS = {
  'CA-A': { col: 7, row: 4 },
  'CA-D': { col: 10, row: 2 },
  'CA-B': { col: 2, row: 1 },
  'CA-C': { col: 4, row: 5 },
}

const LOW = 0.3
const HIGH = 0.65

function noise(i, salt) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

function mix(a, b, t) {
  const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16))
  const pb = b.match(/\w\w/g).map((h) => parseInt(h, 16))
  return `rgb(${pa.map((v, k) => Math.round(v + (pb[k] - v) * t)).join(',')})`
}

export function heatColor(retention) {
  const t = Math.min(1, Math.max(0, (retention - LOW) / (HIGH - LOW)))
  return t < 0.5 ? mix('FDF0D8', 'F79E1B', t * 2) : mix('F79E1B', 'EB001B', (t - 0.5) * 2)
}

function center(col, row) {
  return { x: W / 2 + col * W + (row % 2) * (W / 2) + 4, y: R + row * 1.5 * R + 4 }
}

function hexPoints(cx, cy, r) {
  return Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 180) * (60 * k - 30)
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
  }).join(' ')
}

export default function HeatMap({ areas, activeId, onPick, progress = 1 }) {
  const byPos = Object.fromEntries(
    areas.map((a) => [`${AREA_POSITIONS[a.area_id].col}-${AREA_POSITIONS[a.area_id].row}`, a]),
  )
  const width = W * COLS + W / 2 + 8
  const height = R * 1.5 * (ROWS - 1) + 2 * R + 8

  const cells = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const i = row * COLS + col
      const area = byPos[`${col}-${row}`]
      const { x, y } = center(col, row)
      if (area) continue
      const lowNeed = noise(i, 2) < 0.22
      const value = 0.32 + 0.24 * noise(i, 1)
      const lit = col / COLS < progress
      cells.push(
        <polygon
          key={i}
          points={hexPoints(x, y, R - 1.5)}
          fill={!lit ? '#E6E8EF' : lowNeed ? 'url(#hatch)' : heatColor(value)}
          opacity={lit && !lowNeed ? 0.6 : 1}
          style={{ transition: 'fill 0.4s, opacity 0.4s' }}
        />,
      )
    }
  }

  return (
    <div className="heatmap">
      <svg viewBox={`0 0 ${width} ${height + 28}`} role="img" aria-label="Schematic heat map of candidate areas">
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#EFEBE5" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#CFC6BB" strokeWidth="2" />
          </pattern>
          <pattern id="missing" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <rect width="8" height="8" fill="#FFF" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="#9A5B00" strokeWidth="2.5" />
          </pattern>
        </defs>
        {cells}
        {progress < 1 && (
          <rect x={progress * width - 2} y="0" width="4" height={height} rx="2" fill="#6C7BFF" opacity="0.7" className="scanline" />
        )}
        {progress >= 1 && areas.map((a) => {
          const { col, row } = AREA_POSITIONS[a.area_id]
          const { x, y } = center(col, row)
          const active = a.area_id === activeId
          const fill = a.status === 'investigate' ? 'url(#missing)' : a.status === 'lower' ? 'url(#hatch)' : heatColor(a.retention)
          return (
            <g key={a.area_id} className={`hex-area ${a.status}`} onClick={() => onPick(a)} role="button" tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onPick(a)}>
              <polygon points={hexPoints(x, y, R - 1.5)} fill={fill} stroke={active ? '#1D1A17' : '#FFF'} strokeWidth={active ? 3 : 2} />
              <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={a.status === 'recommended' ? '#FFF' : '#1D1A17'}>
                {a.status === 'investigate' ? '?' : `${Math.round(a.retention * 100)}%`}
              </text>
              <text x={x} y={y + R + 12} textAnchor="middle" fontSize="11" fontWeight={active ? 700 : 500} fill="#1D1A17">
                {a.area_name.split(',')[0]}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="heat-legend small">
        <span className="ramp">
          <i style={{ background: `linear-gradient(90deg, ${heatColor(LOW)}, ${heatColor((LOW + HIGH) / 2)}, ${heatColor(HIGH)})` }} />
          Model-estimated retention {Math.round(LOW * 100)}% → {Math.round(HIGH * 100)}%
        </span>
        
        <span><i className="sw missing" /> Data missing</span>
        
      </div>
    </div>
  )
}
