import { useEffect, useState } from 'react'
import outcome from '../data/simulated_outcome.json'
import story from '../data/story.json'

const pct = (v) => `${Math.round(v * 100)}%`

export default function Learn({ next }) {
  const [ran, setRan] = useState(false)
  const [retrained, setRetrained] = useState(false)
  const rate = outcome.participants_retained_90d / outcome.participants_consented

  useEffect(() => {
    if (!ran) return
    const t = setTimeout(() => setRetrained(true), 1600)
    return () => clearTimeout(t)
  }, [ran])

  const funnel = [
    { label: 'Attended', value: outcome.attended },
    { label: 'Consented', value: outcome.participants_consented },
    { label: 'Stayed 90 days', value: outcome.participants_retained_90d },
  ]

  if (!ran) {
    return (
      <section className="learn-start">
        <div className="card tight contacts-empty">
          <p className="card-title">Contacts</p>
          <span className="zero small-zero">0</span>
          <p className="card-sub">Contacts only exist after people opt in at the pilot.</p>
          <button className="primary big" onClick={() => setRan(true)}>Run the 6-week pilot →</button>
        </div>
      </section>
    )
  }

  return (
    <section className="learn">
      <div className="stat-card grad-warm">
        <span className="stat-label">Stayed at 90 days</span>
        <span className="stat-num">{pct(rate)}</span>
        <span className="stat-sub">{outcome.participants_consented} new consented contacts</span>
      </div>

      <div className="card tight">
        <p className="card-title">Pilot</p>
        {funnel.map((f) => (
          <div key={f.label} className="signal-bar wide">
            <span>{f.label}</span>
            <span className="track"><i className="up" style={{ width: `${(f.value / outcome.attended) * 100}%` }} /></span>
            <b>{f.value}</b>
          </div>
        ))}
      </div>

      <div className="card tight">
        <p className="card-title">What worked</p>
        {story.what_worked.map((w) => (
          <div key={w.source} className="signal-bar wide">
            <span>{w.short}</span>
            <span className="track"><i className="need" style={{ width: `${(w.retained / w.consented) * 100}%` }} /></span>
            <b>{pct(w.retained / w.consented)}</b>
          </div>
        ))}
      </div>

      <div className={`card tight retrain ${retrained ? 'done' : ''}`}>
        <span className="computing"><i />{retrained ? 'Model updated' : 'Updating model'}</span>
        <p className="card-sub">{retrained ? `+${outcome.participants_consented} records · next quarter re-planned` : 'Adding pilot results…'}</p>
        {retrained && <button className="primary full" onClick={next}>Recap →</button>}
      </div>
    </section>
  )
}
