import { useState } from 'react'
import story from '../data/story.json'
import { allocate } from '../lib/budget.js'
import { MODEL_SIGNALS } from '../lib/rank.js'

const pct = (v) => `${Math.round(v * 100)}%`

export default function Act({ selected, brief, setBrief, budget, next }) {
  const [saving, setSaving] = useState(false)
  const funding = allocate(budget).rows.find((r) => r.area_id === selected.area_id)
  const status = brief.status
  const signals = Object.keys(MODEL_SIGNALS)

  async function exportWord() {
    setSaving(true)
    const { downloadBrief } = await import('../lib/wordBrief.js')
    await downloadBrief({ area: selected, brief, funding: funding.series ? funding : null })
    setSaving(false)
  }

  return (
    <section className="act">
      <article className="card doc">
        <div className="doc-head">
          <span className="word-icon">W</span>
          <div>
            <b>Pilot brief · {selected.area_name}</b>
            <span className="card-sub">To {story.bank.name}</span>
          </div>
          <span className={`pill ${status === 'draft' ? 'warn' : 'good'}`}>
            {status === 'draft' ? 'Draft' : status === 'approved' ? 'Approved' : 'Shared'}
          </span>
        </div>

        <div className="doc-stats">
          <div><b>{funding.series ? `$${Math.round(funding.spend / 1000)}K` : '—'}</b><span>budget</span></div>
          <div><b>{funding.people}</b><span>seats</span></div>
          <div><b>{pct(selected.retention)}</b><span>likely to stay</span></div>
        </div>

        <div className="doc-why">
          {signals.map((k) => (
            <span key={k} className="chip on">{MODEL_SIGNALS[k].label} {MODEL_SIGNALS[k].format(selected[k])}</span>
          ))}
        </div>
        <p className="doc-line">6-week financial-education workshops · measured by 90-day retention</p>
      </article>

      <aside className="side">
        <div className="card tight steps-card">
          <div className={`flow-step ${status !== 'draft' ? 'done' : 'active'}`}>
            <span className="tick">{status !== 'draft' ? '✓' : '1'}</span>
            <span>Mastercard review</span>
            {status === 'draft' && <button className="primary" onClick={() => setBrief({ ...brief, status: 'approved' })}>Approve</button>}
          </div>
          <div className={`flow-step ${status === 'shared' ? 'done' : status === 'approved' ? 'active' : ''}`}>
            <span className="tick">{status === 'shared' ? '✓' : '2'}</span>
            <span>Share with bank</span>
            {status === 'approved' && <button className="primary" onClick={() => setBrief({ ...brief, status: 'shared' })}>Share</button>}
          </div>
          <div className={`flow-step ${status === 'shared' ? 'done' : ''}`}>
            <span className="tick">{status === 'shared' ? '✓' : '3'}</span>
            <span>Campaign in bank CRM</span>
          </div>
        </div>
        <button className="word-btn full-w" onClick={exportWord} disabled={saving}>
          <span className="word-icon">W</span>{saving ? 'Building…' : 'Download Word brief'}
        </button>
        {status === 'shared' && <button className="primary big full" onClick={next}>Run the pilot →</button>}
      </aside>
    </section>
  )
}
