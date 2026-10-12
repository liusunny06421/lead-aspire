import { allocate, spreadEvenly } from '../lib/budget.js'

const money = (v) => `$${Math.round(v / 1000)}K`

export default function Plan({ budget, setBudget, next }) {
  const plan = allocate(budget)
  const even = spreadEvenly(budget)
  const extra = Math.round(plan.retained - even.retained)
  const maxRetained = Math.max(...plan.rows.map((r) => r.retained), 1)

  return (
    <section className="plan">
      <div className="plan-top">
        <div className="card tight budget-card">
          <span className="budget-num">{money(budget)}</span>
          <input
            type="range" min="50000" max="400000" step="10000" value={budget}
            onChange={(e) => setBudget(Number(e.target.value))} aria-label="Budget"
          />
          <span className="card-sub">Drag to change the budget</span>
        </div>
        <div className="stat-card grad-warm">
          <span className="stat-label">People who stay</span>
          <span className="stat-num">{Math.round(plan.retained)}</span>
        </div>
        <div className="stat-card grad-cool">
          <span className="stat-label">vs. spreading evenly</span>
          <span className="stat-num">+{extra}</span>
        </div>
      </div>

      <div className="card alloc">
        {plan.rows.map((r) => (
          <div key={r.area_id} className={`alloc-row ${r.series ? '' : 'unfunded'}`}>
            <b>{r.area_name}</b>
            <span className="alloc-bar"><i style={{ width: `${(r.retained / maxRetained) * 100}%` }} /></span>
            <span className="alloc-num">{r.series ? money(r.spend) : '—'}</span>
          </div>
        ))}
        <div className="alloc-foot">
          <button className="primary big" onClick={next}>Create the Mesa Flats pilot →</button>
        </div>
      </div>
    </section>
  )
}
