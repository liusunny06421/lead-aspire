import story from '../data/story.json'

const PILOTS = [
  '6-week financial-education workshop series with a local community partner',
  'Monthly financial-education evenings hosted at a community partner site',
  'Bilingual financial-education workshop series with a local community partner',
]

export default function BankHandoff({ selected, brief, setBrief, next }) {
  if (!selected || !brief) {
    return <p className="lead">Choose an area on the previous step first.</p>
  }
  const approved = brief.status !== 'draft'
  const shared = brief.status === 'shared'
  const update = (patch) => setBrief({ ...brief, ...patch })
  const toggleClaim = (id) =>
    update({ claims: brief.claims.map((c) => (c.id === id ? { ...c, kept: !c.kept } : c)) })
  const kept = brief.claims.filter((c) => c.kept)
  const target = Math.round(selected.retention * 100)

  return (
    <section className="handoff">
      <article className={`brief card ${approved ? 'locked' : ''}`}>
        <div className="brief-head">
          <div>
            <p className="eyebrow">Partner-bank pilot brief</p>
            <h1>{selected.area_name}</h1>
            <p className="small muted">
              For {story.bank.name} · Attn: {story.bank.contact}, {story.bank.contact_role} · Prepared by {story.user.name}
            </p>
          </div>
          <span className={`status-pill ${approved ? 'approved' : 'draft'}`}>
            {shared ? `Shared with ${story.bank.short}` : approved ? `Approved by ${story.reviewer.name}` : 'Draft: edit before review'}
          </span>
        </div>

        <div className="field">
          <h3>Why review it</h3>
          <ul className="claims">
            {brief.claims.map((c) => (
              <li key={c.id} className={c.kept ? '' : 'removed'}>
                <label>
                  <input type="checkbox" checked={c.kept} disabled={approved} onChange={() => toggleClaim(c.id)} />
                  {c.text}
                </label>
              </li>
            ))}
          </ul>
          <p className="small muted">
            Signals the research paper's model found informative, plus local need. Untick a claim to remove it before sharing.
          </p>
        </div>

        <div className="field">
          <h3>What we don't know</h3>
          <textarea
            value={brief.unknowns}
            disabled={approved}
            onChange={(e) => update({ unknowns: e.target.value })}
            rows={2}
          />
        </div>

        <div className="field">
          <h3>Suggested pilot</h3>
          <select value={brief.pilot} disabled={approved} onChange={(e) => update({ pilot: e.target.value })}>
            {PILOTS.map((p) => <option key={p}>{p}</option>)}
          </select>
          <p className="small muted">Subject to bank review.</p>
        </div>

        <div className="field">
          <h3>Bank decision required</h3>
          <ul className="plain">
            <li>Confirm the area is locally relevant to the bank's community goals</li>
            <li>Confirm staffing capacity for the pilot</li>
            <li>Confirm an appropriate host partner</li>
          </ul>
        </div>

        <div className="field two">
          <div>
            <h3>Measurement plan</h3>
            <ul className="plain">
              <li>Consented participation</li>
              <li>A recorded first interaction</li>
              <li>
                <b>90-day retention:</b> share of consenting participants with at least one more recorded
                interaction within 90 days of their first
              </li>
            </ul>
          </div>
          <div>
            <h3>Data handling</h3>
            <ul className="plain">
              <li>Collect individual information only with consent</li>
              <li>No identities inferred from area-level data</li>
              <li>Area figures in this brief are synthetic</li>
            </ul>
          </div>
        </div>

        <div className="brief-actions">
          {brief.status === 'draft' && (
            <button className="primary big" onClick={() => update({ status: 'approved' })} disabled={kept.length === 0}>
              Approve as reviewer ({story.reviewer.name})
            </button>
          )}
          {brief.status === 'approved' && (
            <>
              <button className="ghost" onClick={() => update({ status: 'draft' })}>Reopen draft</button>
              <button className="primary big" onClick={() => update({ status: 'shared' })}>
                Share with {story.bank.short} →
              </button>
            </>
          )}
          {shared && (
            <button className="primary big" onClick={next}>Jump ahead to pilot results →</button>
          )}
        </div>
        {shared && (
          <ol className="timeline">
            {story.timeline.slice(0, 2).map((t) => (
              <li key={t.date}><span className="mono">{t.date}</span> {t.event}</li>
            ))}
            <li className="small muted">Demo only: nothing was actually sent.</li>
          </ol>
        )}
      </article>

      <aside className="sf card">
        <div className="sf-head">
          <span className="sf-logo" aria-hidden>☁</span>
          <div>
            <b>Campaign</b>
            <div className="small">Proposed integration: not connected</div>
          </div>
        </div>
        <dl>
          <dt>Account</dt>
          <dd>{story.bank.name}</dd>
          <dt>Campaign name</dt>
          <dd>{selected.area_name.split(',')[0]} financial-education pilot</dd>
          <dt>Type</dt>
          <dd>Financial Education</dd>
          <dt>Status</dt>
          <dd>{shared ? 'Planned · shared with bank' : approved ? 'Planned' : 'Draft'}</dd>
          <dt>Description</dt>
          <dd>{brief.pilot}</dd>
          <dt>Expected response</dt>
          <dd>{target}% 90-day retention (model estimate, synthetic)</dd>
          <dt>Evidence attached</dt>
          <dd>{kept.length} of {brief.claims.length} claims</dd>
        </dl>
        <p className="small muted">
          Mockup. An approved brief would become a Salesforce Campaign for the partner bank's team. Nothing is
          sent from this prototype.
        </p>
      </aside>
    </section>
  )
}
