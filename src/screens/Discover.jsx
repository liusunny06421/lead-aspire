import { useEffect, useState } from 'react'
import story from '../data/story.json'
import HeatMap from '../components/HeatMap.jsx'
import { MODEL_SIGNALS, contributions } from '../lib/rank.js'

const RUN_MS = 3200
const pct = (v) => `${Math.round(v * 100)}%`
const STAGES = ['Joining data', 'Checking need', 'Applying model', 'Ranking']

export default function Discover({ areas, ran, setRan, openResearch, next }) {
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

  const stage = Math.min(STAGES.length - 1, Math.floor(progress * STAGES.length))
  const active = areas.find((a) => a.area_id === activeId)
  const scored = active.status !== 'investigate'

  return (
    <section className="discover">
      <div className="card map-card">
        <HeatMap areas={areas} activeId={ran ? activeId : null} onPick={(a) => setActiveId(a.area_id)} progress={progress} />
      </div>

      <aside className="side">
        {!ran ? (
          <div className="card tight model-card">
            <p className="card-sub">{story.region}</p>
            <p className="formula-mini">retention = f(income, volatility, rent)</p>
            <div className="stages">
              {STAGES.map((s, i) => (
                <span key={s} className={progress >= 1 || i < stage ? 'done' : running && i === stage ? 'active' : ''}>{s}</span>
              ))}
            </div>
            <button className="primary big full" onClick={() => setRunning(true)} disabled={running}>
              {running ? 'Computing…' : 'Run model'}
            </button>
          </div>
        ) : (
          <>
            <div className={`stat-card ${active.status === 'recommended' ? 'grad-warm' : 'grad-cool'}`}>
              <span className="stat-label">{active.area_name}</span>
              <span className="stat-num">{scored ? pct(active.retention) : '?'}</span>
              <span className="stat-sub">{scored ? 'likely to stay' : 'data missing'}</span>
            </div>
            <div className="card tight">
              {contributions(active).map((c) => (
                <div key={c.key} className="signal-bar">
                  <span>{MODEL_SIGNALS[c.key].label}</span>
                  <span className="track">
                    {c.contribution != null && (
                      <i className={c.contribution >= 0 ? 'up' : 'down'} style={{ width: `${Math.min(100, Math.abs(c.contribution) * 450)}%` }} />
                    )}
                  </span>
                </div>
              ))}
              <button className="link" onClick={openResearch}>Why these signals?</button>
            </div>
            <button className="primary big full" onClick={next}>Plan budget →</button>
          </>
        )}
      </aside>
    </section>
  )
}
