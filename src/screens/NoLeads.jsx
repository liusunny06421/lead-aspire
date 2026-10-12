import story from '../data/story.json'
import { useEffect, useState } from 'react'

const QUERY = story.search_query

export default function NoLeads({ next }) {
  const [typed, setTyped] = useState('')
  const done = typed.length === QUERY.length

  useEffect(() => {
    if (done) return
    const t = setTimeout(() => setTyped(QUERY.slice(0, typed.length + 1)), 35)
    return () => clearTimeout(t)
  }, [typed, done])

  return (
    <section className="split">
      <div className="crm card">
        <div className="crm-head">
          <span className="crm-title">{story.bank.name} · Leads</span>
          
        </div>
        <div className="crm-search">
          <span className="icon" aria-hidden>⌕</span>
          <span>{typed}</span>
          {!done && <span className="caret" />}
        </div>
        <div className="crm-filters">
          <span className="chip">Status: Any</span>
          <span className="chip">Source: Any</span>
          <span className="chip">Created: All time</span>
        </div>
        <table className="crm-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Company</th>
              <th>Lead source</th>
              <th>Status</th>
            </tr>
          </thead>
        </table>
        <div className={`empty ${done ? 'show' : ''}`}>
          <div className="zero">0</div>
          <div>records found</div>
          
        </div>
      </div>

      <div className="pitch">
                <h1>Every CRM starts at account opening.</h1>
        <div className={`question ${done ? 'show' : ''}`}>
          <p>Where should we run the next outreach program?</p>
          <button className="primary big" onClick={next}>
            Find where to start →
          </button>
        </div>
      </div>
    </section>
  )
}
