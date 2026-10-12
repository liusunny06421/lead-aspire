import { useEffect, useState } from 'react'
import story from '../data/story.json'

export default function Problem({ next }) {
  const [typed, setTyped] = useState('')
  const done = typed.length === story.search_query.length

  useEffect(() => {
    if (done) return
    const t = setTimeout(() => setTyped(story.search_query.slice(0, typed.length + 1)), 35)
    return () => clearTimeout(t)
  }, [typed, done])

  return (
    <section className="problem">
      <div className="card crm-min">
        <p className="card-sub">{story.bank.name} · CRM</p>
        <div className="crm-search">
          <span className="icon" aria-hidden>⌕</span>
          <span>{typed}</span>
          {!done && <span className="caret" />}
        </div>
        <div className={`empty ${done ? 'show' : ''}`}>
          <div className="zero">0</div>
          <div className="card-sub">leads</div>
        </div>
      </div>
      <div className={`problem-cta ${done ? 'show' : ''}`}>
        <p className="lead-big">No lead list. No data. <br />So where do you start?</p>
        <button className="primary big" onClick={next}>Start →</button>
      </div>
    </section>
  )
}
