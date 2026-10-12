import { allocate } from '../lib/budget.js'
import outcome from '../data/simulated_outcome.json'

const pct = (v) => `${Math.round(v * 100)}%`

export default function Recap({ selected, budget, goTo }) {
  const plan = allocate(budget)
  const stages = [
    { step: 0, label: 'Problem', value: '0', sub: 'leads' },
    { step: 1, label: 'Data', value: 'US', sub: 'gap mapped' },
    { step: 2, label: 'Model', value: pct(selected.retention), sub: selected.area_name.split(',')[0] },
    { step: 3, label: 'Decide', value: `$${Math.round(budget / 1000)}K`, sub: `${Math.round(plan.retained)} expected to stay` },
    { step: 4, label: 'Act', value: 'W', sub: 'brief to bank' },
    { step: 5, label: 'Learn', value: pct(outcome.participants_retained_90d / outcome.participants_consented), sub: 'stayed 90 days' },
  ]

  return (
    <section className="recap">
      <div className="flow">
        {stages.map((s, i) => (
          <button key={s.label} className="flow-node" onClick={() => goTo(s.step)} style={{ animationDelay: `${i * 0.12}s` }}>
            <span className="flow-label">{s.label}</span>
            <span className="flow-value">{s.value}</span>
            <span className="flow-sub">{s.sub}</span>
          </button>
        ))}
      </div>
      <div className="recap-cards">
        <div className="card tight"><p className="card-sub">Mastercard gets</p><p className="card-title">Where to invest, and proof it worked</p></div>
        <div className="card tight"><p className="card-sub">Banks get</p><p className="card-title">A ready-to-run pilot and new customers</p></div>
        <div className="card tight"><p className="card-sub">People get</p><p className="card-title">A way into the financial system</p></div>
      </div>
    </section>
  )
}
