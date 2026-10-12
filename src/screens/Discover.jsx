import { useEffect, useState } from 'react'
import story from '../data/story.json'
import HeatMap from '../components/HeatMap.jsx'
import { MODEL_SIGNALS, STATUS, contributions } from '../lib/rank.js'

const RUN_MS = 3200
const pct = (v) => `${Math.round(v * 100)}%`
const signed = (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2)

function AreaDetail({ area, onSelect }) {
  const scored = area.status !== 'investigate'
  return (
    <div className="detail">
      <div className={`stat-card ${area.status === 'recommended' ? 'grad-warm' : 'grad-cool'}`}>
        <span className="stat-label">{area.area_name}</span>
        <span className={`pill ${STATUS[area.status].tone}`}>{STATUS[area.status].label}</span>
        <span className="stat-num">{scored ? pct(area.retention) : '—'}</span>
        <span className="stat-sub">Est. 90-day retention</span>
      </div>

      <div className="card tight">
        <p className="card-title">Why</p>
        {contributions(area).map((c) => (
          <div key={c.key} className="signal-bar">
            <span>{MODEL_SIGNALS[c.key].label}</span>
            <span className="track">
              {c.contribution != null && (
                <i className={c.contribution >= 0 ? 'up' : 'down'}
                  style={{ width: `${Math.min(100, Math.abs(c.contribution) * 450)}%` }} />
              )}
            </span>
            <b>{c.contribution == null ? 'missing' : signed(c.contribution)}</b>
          </div>
        ))}
        <div className="signal-bar">
          <span>Unbanked share</span>
          <span className="track"><i className="need" style={{ width: `${area.financial_access_gap * 250}%` }} /></span>
          <b>{pct(area.financial_access_gap)}</b>
        </div>
        <p className="caveat">{area.counterpoint}</p>
        {scored && area.status !== 'lower' && (
          <button className="primary full" onClick={() => onSelect(area)}>Generate bank brief →</button>
        )}
      </div>
    </div>
  )
}

export default function Discover({ areas, selectArea, ran, setRan }) {
  const [progress, setProgress] = useState(ran ? 1 : 0)
  const [running, setRunning] = useState(false)
  const [activeId, setActiveId] = useState(areas.find((a) => a.status === 'recommended').area_id)

  useEffect(() => {
    if (!running) return
    const start = performance.now()
    let frame
    const tick = (t) => {
      const p = Math.min(1, (t - start) / RUN_MS)
      setProgress(p)
      if (p < 1) frame = requestAnimationFrame(tick)
      else { setRunning(false); setRan(true) }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [running, setRan])

  const stepIndex = Math.min(story.discovery_steps.length - 1, Math.floor(progress * story.discovery_steps.length))
  const active = areas.find((a) => a.area_id === activeId)
  const ORDER = ['recommended', 'alternative', 'lower', 'investigate']
  const shortlist = [...areas].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status))

  return (
    <section className="discover">
      <div className="map-card card">
        <div className="card-head">
          <div>
            <p className="card-title">{story.region}</p>
            <p className="card-sub">4 aggregate datasets · no individual records</p>
          </div>
          {!ran && !running && <button className="primary" onClick={() => setRunning(true)}>Run discovery</button>}
          {running && <span className="computing"><i />{story.discovery_steps[stepIndex]}…</span>}
          {ran && <span className="pill good">4 areas scored</span>}
        </div>
        <HeatMap areas={areas} activeId={ran ? activeId : null} onPick={(a) => setActiveId(a.area_id)} progress={progress} />
        <div className="chips">
          {story.datasets.map((d, i) => (
            <span key={d.id} className={`chip ${progress > i / story.datasets.length ? 'on' : ''}`}>{d.name}</span>
          ))}
        </div>
      </div>

      <aside className="side">
        {ran ? (
          <>
            <AreaDetail area={active} onSelect={selectArea} />
            <div className="card tight">
              <p className="card-title">Shortlist</p>
              {shortlist.map((a) => (
                <button key={a.area_id} className={`list-row ${a.area_id === activeId ? 'on' : ''}`} onClick={() => setActiveId(a.area_id)}>
                  <span>{a.area_name.split(',')[0]}</span>
                  <span className={`dot-status ${STATUS[a.status].tone}`} />
                  <b>{a.status === 'investigate' ? '?' : pct(a.retention)}</b>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="card tight waiting">
            <p className="card-title">Model</p>
            <p className="formula-mini">logit(p) = β₀ + 0.22·income − 0.16·volatility + 0.13·rent</p>
            <ol className="run-steps">
              {story.discovery_steps.map((s, i) => (
                <li key={s} className={progress >= 1 || i < stepIndex ? 'done' : running && i === stepIndex ? 'active' : ''}>
                  <span className="tick">{progress >= 1 || i < stepIndex ? '✓' : ''}</span>{s}
                </li>
              ))}
            </ol>
          </div>
        )}
      </aside>
    </section>
  )
}
