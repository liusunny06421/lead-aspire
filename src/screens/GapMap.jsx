import { useMemo, useState } from 'react'
import { feature, mesh } from 'topojson-client'
import { geoPath } from 'd3-geo'
import us from 'us-atlas/states-albers-10m.json'
import gapData from '../data/state_gap.json'

const LAYERS = {
  underserved: { label: 'Underserved', key: 'underserved', min: 8, max: 23, from: '#F1EEFF', to: '#6E56CF' },
  reach: { label: 'Mastercard reach', key: 'reach', min: 40, max: 86, from: '#E6F0FF', to: '#2B5BDB' },
  gap: { label: 'Gap', key: 'gap', min: 10, max: 75, from: '#FDF0D8', to: '#EB001B' },
}
const TEXAS = '48'

function mix(a, b, t) {
  const pa = a.slice(1).match(/\w\w/g).map((h) => parseInt(h, 16))
  const pb = b.slice(1).match(/\w\w/g).map((h) => parseInt(h, 16))
  return `rgb(${pa.map((v, k) => Math.round(v + (pb[k] - v) * t)).join(',')})`
}

function color(layer, value) {
  const t = Math.min(1, Math.max(0, (value - layer.min) / (layer.max - layer.min)))
  return mix(layer.from, layer.to, t)
}

export default function GapMap({ next }) {
  const [layerKey, setLayerKey] = useState('underserved')
  const [hover, setHover] = useState(null)
  const layer = LAYERS[layerKey]

  const { states, borders, path } = useMemo(() => {
    const path = geoPath()
    return {
      path,
      states: feature(us, us.objects.states).features,
      borders: path(mesh(us, us.objects.states, (a, b) => a !== b)),
    }
  }, [])

  const shown = gapData[hover ?? TEXAS]

  return (
    <section className="gapmap">
      <div className="card map-card">
        <div className="seg">
          {Object.entries(LAYERS).map(([k, l], i) => (
            <button key={k} className={k === layerKey ? 'on' : ''} onClick={() => setLayerKey(k)}>
              {i + 1}. {l.label}
            </button>
          ))}
        </div>
        <svg viewBox="0 0 975 610" className="usmap" role="img" aria-label={`US map: ${layer.label}`}>
          {states.map((f) => (
            <path
              key={f.id}
              d={path(f)}
              fill={color(layer, gapData[f.id][layer.key])}
              className={`state ${f.id === TEXAS && layerKey === 'gap' ? 'picked' : ''}`}
              onMouseEnter={() => setHover(f.id)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
          <path d={borders} fill="none" stroke="#fff" strokeWidth="1" pointerEvents="none" />
        </svg>
      </div>

      <aside className="side">
        <div className="stat-card grad-warm">
          <span className="stat-label">{shown.name}</span>
          <span className="stat-num">{shown.gap}</span>
          <span className="stat-sub">gap score</span>
        </div>
        <div className="card tight">
          <div className="signal-bar">
            <span>Underserved</span>
            <span className="track"><i className="need" style={{ width: `${(shown.underserved / 25) * 100}%` }} /></span>
            <b>{shown.underserved}%</b>
          </div>
          <div className="signal-bar">
            <span>MC reach</span>
            <span className="track"><i className="up" style={{ width: `${shown.reach}%` }} /></span>
            <b>{shown.reach}</b>
          </div>
        </div>
        {layerKey === 'gap' ? (
          <button className="primary big full" onClick={next}>Zoom into Texas →</button>
        ) : (
          <button className="ghost big full" onClick={() => setLayerKey(layerKey === 'underserved' ? 'reach' : 'gap')}>
            Next layer →
          </button>
        )}
      </aside>
    </section>
  )
}
