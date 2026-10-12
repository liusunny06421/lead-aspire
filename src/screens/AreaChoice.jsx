import { useState } from 'react'
import {
  paper, MODEL_SIGNALS, CONTEXT_SIGNALS, STATUS, NEED_GATE, contributions, zScore,
} from '../lib/rank.js'

const ORDER = ['recommended', 'alternative', 'investigate', 'lower']
const pct = (v) => `${Math.round(v * 100)}%`
const signed = (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2)

function ModelRow({ area, c }) {
  const meta = MODEL_SIGNALS[c.key]
  const missing = area[c.key] == null
  const unverified = area.unverified_fields.includes(c.key)
  const width = c.contribution == null ? 0 : Math.min(50, Math.abs(c.contribution) * 140)
  return (
    <li>
      <span title={meta.explain}>{meta.label}</span>
      <span className="val">
        {missing ? <span className="missing">missing</span> : meta.format(area[c.key])}
        {unverified && <span className="unverified">unverified</span>}
      </span>
      <span className="effect" title="Effect on log-odds of retention (β × SD from average)">
        <i className="axis" />
        {c.contribution != null && (
          <i
            className={c.contribution >= 0 ? 'up' : 'down'}
            style={c.contribution >= 0 ? { left: '50%', width: `${width}%` } : { right: '50%', width: `${width}%` }}
          />
        )}
      </span>
    </li>
  )
}

function AreaCard({ area, onSelect }) {
  const status = STATUS[area.status]
  const scored = area.status !== 'investigate'
  return (
    <article className={`area card ${area.status}`}>
      <span className={`badge ${status.tone}`}>{status.label}</span>
      <h2>{area.area_name}</h2>
      <p className="muted small">{area.archetype} · fictional</p>

      <div className="estimate">
        <span className="est-num">{scored ? pct(area.retention) : '—'}</span>
        <span className="small">model-estimated<br />90-day retention</span>
      </div>

      <p className="group-label">Model signals <span className="muted">(effect →)</span></p>
      <ul className="signals model">
        {contributions(area).map((c) => <ModelRow key={c.key} area={area} c={c} />)}
      </ul>

      <p className="group-label">Context</p>
      <ul className="signals">
        {Object.entries(CONTEXT_SIGNALS).map(([k, meta]) => (
          <li key={k} className={k === 'financial_access_gap' && !area.hasNeed ? 'fail' : ''}>
            <span>{meta.label}</span>
            <span className="val">{meta.format(area[k])}</span>
          </li>
        ))}
      </ul>

      <div className="why">
        {area.explanation.map((s) => <p key={s}>{s}</p>)}
      </div>
      <p className="counter"><b>Counterpoint:</b> {area.counterpoint}</p>

      {area.status === 'investigate' ? (
        <button className="ghost full" disabled title="Not eligible for a brief until data is verified">
          Request missing data
        </button>
      ) : area.status === 'lower' ? (
        <button className="ghost full" disabled>Below need threshold</button>
      ) : (
        <button className={`${area.status === 'recommended' ? 'primary' : 'ghost'} full`} onClick={() => onSelect(area)}>
          {area.status === 'recommended' ? 'Select for pilot →' : 'Select instead'}
        </button>
      )}
    </article>
  )
}

export default function AreaChoice({ areas, selectArea }) {
  const [open, setOpen] = useState(false)
  const sorted = [...areas].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status))
  const coef = Object.fromEntries(paper.coefs.map((c) => [c.key, c]))

  return (
    <section>
      <div className="screen-head">
        <div>
          <p className="eyebrow">Discovery results · 4 areas in the region</p>
          <h1>Start in {sorted[0].area_name.split(',')[0]}.</h1>
          <p className="lead">
            Each area is scored with the research paper's β weights on area averages of three signals. Two checks
            come first: enough need, and enough data. Every number below is inspectable.
          </p>
        </div>
        <div className="synthetic-tag">Synthetic data</div>
      </div>

      <div className="areas four">
        {sorted.map((a) => <AreaCard key={a.area_id} area={a} onSelect={selectArea} />)}
      </div>

      <div className="ranking card">
        <button className="disclosure" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? '▾' : '▸'} How was this scored?
          <span className="muted small"> Coefficients from the research paper, Table 1 (synthetic data)</span>
        </button>
        {open && (
          <>
            <p className="formula mono">
              log-odds(retained) = {signed(coef.intercept.beta)}
              {Object.keys(MODEL_SIGNALS).map((k) => (
                <span key={k}> {coef[k].beta >= 0 ? '+' : '−'} {Math.abs(coef[k].beta).toFixed(2)} × {MODEL_SIGNALS[k].label.toLowerCase()}<sub>SD</sub></span>
              ))}
              <span className="muted"> + engagement terms, held at average (they don't exist before contact)</span>
            </p>
            <table className="rank-table">
              <thead>
                <tr>
                  <th>Signal</th>
                  <th className="num">β</th>
                  <th className="num">Past-participant average</th>
                  {sorted.map((a) => <th key={a.area_id} className="num">{a.area_name.split(',')[0]} (SD)</th>)}
                </tr>
              </thead>
              <tbody>
                {Object.entries(MODEL_SIGNALS).map(([k, meta]) => (
                  <tr key={k}>
                    <td>{meta.label}</td>
                    <td className="num mono">{signed(coef[k].beta)}</td>
                    <td className="num mono">{meta.format(meta.mean)} ± {k === 'balance_volatility' ? meta.sd : pct(meta.sd)}</td>
                    {sorted.map((a) => {
                      const z = zScore(a, k)
                      return <td key={a.area_id} className="num mono">{z == null ? '—' : signed(z)}</td>
                    })}
                  </tr>
                ))}
                <tr className="total">
                  <td>Estimated retention</td>
                  <td />
                  <td />
                  {sorted.map((a) => (
                    <td key={a.area_id} className="num mono">
                      {a.status === 'investigate' ? 'not scored' : pct(a.retention)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <p className="small muted">
              Need check: at least {pct(NEED_GATE)} of households unbanked or underbanked. Data check: all three model
              signals present and verified. Distance, partners and access gap are context, not model inputs. The
              estimate says where outreach is worth testing, not what any person will do.
            </p>
          </>
        )}
      </div>
    </section>
  )
}
