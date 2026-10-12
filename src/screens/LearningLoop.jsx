import { useState } from 'react'
import { followupModel, paper } from '../lib/rank.js'
import outcome from '../data/simulated_outcome.json'
import story from '../data/story.json'
import programs from '../data/historical_programs.json'

const pct = (v) => `${Math.round(v * 100)}%`

export default function LearningLoop({ selected }) {
  const [added, setAdded] = useState(false)
  const area = selected ?? { area_name: 'Mesa Flats, TX', retention: 0.62 }
  const rate = outcome.participants_retained_90d / outcome.participants_consented
  const d = {
    programs: programs.length,
    participants: paper.n,
  }
  const recent = programs.slice(-3)

  const funnel = [
    { label: 'Attended', value: outcome.attended },
    { label: 'Consented', value: outcome.participants_consented },
    { label: 'First interaction recorded', value: outcome.first_interactions_recorded },
    { label: 'Retained at 90 days', value: outcome.participants_retained_90d },
  ]

  return (
    <section>
      <div className="screen-head">
        <div>
          <p className="eyebrow">Learning loop</p>
          <h1>{story.bank.short} met 64 people. 22 came back.</h1>
          <p className="lead">Pilot ran Feb 2 – Mar 9, 2027; 90-day readout Jun 1. Individual records appear only here, after people chose to take part and consented.</p>
        </div>
        <div className="synthetic-tag sim">Simulated future outcome</div>
      </div>

      <div className="loop-grid">
        <article className="card">
          <h3>{area.area_name}: pilot results</h3>
          <div className="funnel">
            {funnel.map((f) => (
              <div key={f.label} className="bar-row">
                <span className="bar-label">{f.label}</span>
                <span className="bar" style={{ width: `${(f.value / outcome.attended) * 100}%` }}>
                  {f.value}
                </span>
              </div>
            ))}
          </div>
          <div className="retention">
            <div className="big-num">{pct(rate)}</div>
            <div>
              <b>90-day retention</b>
              <div className="small muted">
                {outcome.participants_retained_90d} of {outcome.participants_consented} consenting participants.
                The model estimated {pct(area.retention)} before outreach. One pilot can't prove or
                disprove the model; it becomes training data for the next fit.
              </div>
            </div>
          </div>
        </article>

        <article className="card">
          <h3>Data flowing back from {story.bank.short}</h3>
          <ul className="feed">
            {story.consent_feed.map((f) => (
              <li key={f.time + f.text}><span className="mono">{f.time}</span>{f.text}</li>
            ))}
          </ul>
          <p className="small muted">Only consented participants. Synced to the bank's CRM as Leads and Activities.</p>
        </article>

        <article className="card">
          <h3>Retention follow-up · day {outcome.followup_day}</h3>
          <p className="small">
            <b>{outcome.no_return_at_followup}</b> consented participants haven't had a return interaction yet.
            The paper's engagement parameters flag who is drifting: relationship duration (odds ratio{' '}
            {followupModel.duration.or.toFixed(2)}), consented visits ({followupModel.visits.or.toFixed(2)}) and opt-in
            response ({followupModel.optin.or.toFixed(2)}).
          </p>
          <table className="follow">
            <thead>
              <tr><th>Participant</th><th>Why flagged</th><th>Last interaction</th><th>Suggested next step</th></tr>
            </thead>
            <tbody>
              {outcome.followup_examples.map((p) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td>{p.flag}</td>
                  <td>{p.last_interaction} · {p.days_since}d ago</td>
                  <td>{p.next_step}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small muted">Fictional participants. Showing 4 of {outcome.no_return_at_followup}.</p>
        </article>

        <article className="card">
          <h3>What worked</h3>
          <p className="small">90-day retention by how participants first heard about the program.</p>
          <div className="worked">
            {story.what_worked.map((w) => (
              <div key={w.source} className="bar-row">
                <span className="bar-label">{w.source}</span>
                <span className="bar plain-bar" style={{ width: `${(w.retained / w.consented) * 100}%` }}>
                  {Math.round((w.retained / w.consented) * 100)}% · {w.retained}/{w.consented}
                </span>
              </div>
            ))}
          </div>
          <p className="small"><b>For the next pilot:</b> test recruiting through the library partner first.</p>
          <p className="small muted">Simulated. Small groups, so treat as a lead to test, not a conclusion.</p>
        </article>

        <article className="card sf-map">
          <h3>How it would land in Salesforce</h3>
          <p className="small muted">Proposed integration: not connected</p>
          <ul className="mapping">
            <li><span>Approved brief</span><i>→</i><b>Campaign</b></li>
            <li><span>Consented participant</span><i>→</i><b>Lead</b> (Lead Source = program)</li>
            <li><span>Workshop, call, branch visit</span><i>→</i><b>Activity</b></li>
            <li><span>90-day retention</span><i>→</i><b>Report</b> on Campaign Members with an Activity within 90 days</li>
          </ul>
        </article>

        <article className="card dataset">
          <h3>Feed the next decision</h3>
          <p className="small">
            This pilot's 41 participants join the data, and the β weights are re-estimated on real outcomes.
          </p>
          <table className="mini">
            <thead>
              <tr><th>Program</th><th>Area</th><th className="num">n</th><th className="num">Retention</th></tr>
            </thead>
            <tbody>
              {recent.map((p) => (
                <tr key={p.program_id}>
                  <td className="mono">{p.program_id}</td>
                  <td>{p.area_name}</td>
                  <td className="num mono">{p.participants_consented}</td>
                  <td className="num mono">{pct(p.retention_rate_90d)}</td>
                </tr>
              ))}
              {added && (
                <tr className="new-row">
                  <td className="mono">P-{String(d.programs + 1).padStart(3, '0')}</td>
                  <td>{area.area_name}</td>
                  <td className="num mono">{outcome.participants_consented}</td>
                  <td className="num mono">{pct(rate)}</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="dataset-foot">
            <span className="mono">
              {added ? d.programs + 1 : d.programs} programs ·{' '}
              <b>{(added ? d.participants + outcome.participants_consented : d.participants).toLocaleString()}</b> participants for the next fit
            </span>
            <button className="primary" onClick={() => setAdded(true)} disabled={added}>
              {added ? 'Added ✓' : 'Add to research dataset'}
            </button>
          </div>
        </article>
      </div>

      <p className="closing">
        We can't name people we haven't met. We can decide where to meet them, and learn whether they stay.
      </p>
    </section>
  )
}
