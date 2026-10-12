import { paper, contributions, MODEL_SIGNALS } from '../lib/rank.js'

const DECISIONS = {
  consented_visits: { label: 'Follow-up list only', tone: 'warn' },
  optin_response: { label: 'Follow-up list only', tone: 'warn' },
  relationship_duration: { label: 'Follow-up list only', tone: 'warn' },
  income_regularity: { label: 'Use to rank areas', tone: 'good' },
  balance_volatility: { label: 'Use to rank areas', tone: 'good' },
  rent_on_time: { label: 'Use, borderline', tone: 'good' },
  utility_on_time: { label: 'Drop', tone: 'bad' },
  cash_buffer: { label: 'Drop', tone: 'bad' },
  payment_gap_freq: { label: 'Drop', tone: 'bad' },
}
const GROUP_COLOR = { engagement: '#C0392B', pre_contact: '#2E6DB4', weak: '#9A928A' }

const pct = (v) => `${Math.round(v * 100)}%`
const signed = (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2)
const pval = (c) => c.p_text ?? c.p.toFixed(3)

// Forest plot of the paper's odds ratios (Figure 1), drawn from Table 1.
function Forest({ rows }) {
  const W = 620, rowH = 26, left = 170, right = 20, top = 8
  const lo = 0.7, hi = 1.75
  const x = (v) => left + ((Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))) * (W - left - right)
  const H = top + rows.length * rowH + 30
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="forest" role="img" aria-label="Odds ratios with 95% confidence intervals">
      <line x1={x(1)} x2={x(1)} y1={top} y2={top + rows.length * rowH} stroke="#9A928A" strokeDasharray="3 3" />
      {rows.map((c, i) => {
        const y = top + i * rowH + rowH / 2
        const color = GROUP_COLOR[c.group]
        return (
          <g key={c.key}>
            <text x={left - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#1D1A17">{c.label}</text>
            <line x1={x(c.or_low)} x2={x(c.or_high)} y1={y} y2={y} stroke={color} strokeWidth="2" />
            <circle cx={x(c.or)} cy={y} r="4.5" fill={color} />
          </g>
        )
      })}
      {[0.8, 1, 1.2, 1.4, 1.6].map((t) => (
        <text key={t} x={x(t)} y={H - 12} textAnchor="middle" fontSize="11" fill="#4A443E">{t.toFixed(1)}</text>
      ))}
    </svg>
  )
}

export default function ResearchBrief({ selected, next }) {
  const rows = paper.coefs.filter((c) => c.key !== 'intercept')
  const by = Object.fromEntries(rows.map((c) => [c.key, c]))
  const income = by.income_regularity
  const volatility = by.balance_volatility
  const rent = by.rent_on_time

  return (
    <section className="paper-wrap">
      <article className="paper">
        <div className="synthetic-banner">Synthetic demonstration data: not real findings</div>
        {selected && (
          <div className="why-picked">
            <p className="eyebrow">Why did the model pick {selected.area_name}?</p>
            <p>
              Estimated 90-day retention <b>{pct(selected.retention)}</b>. Each signal's push on the estimate (β × SDs from average):
            </p>
            <ul>
              {contributions(selected).map((c) => (
                <li key={c.key}>
                  <span>{MODEL_SIGNALS[c.key].label} {MODEL_SIGNALS[c.key].format(selected[c.key])}</span>
                  <b className={c.contribution >= 0 ? 'pos' : 'neg'}>{signed(c.contribution)}</b>
                </li>
              ))}
            </ul>
            <p className="small muted">The paper below explains where these β weights come from.</p>
          </div>
        )}
        <p className="paper-kicker">Research paper · logistic regression · LEAD ASPIRE 2026</p>
        <h1 className="paper-title">{paper.title}</h1>
        <p className="paper-sub">{paper.subtitle}</p>

        <div className="paper-grid">
          <div>
            <h3>Hypothesis</h3>
            <p className="formula-serif">
              logit P(retained at 90 days) = β<sub>0</sub> + Σ β<sub>k</sub>x<sub>k</sub>, testing H<sub>0</sub>: β<sub>k</sub> = 0
            </p>
            <p>
              We expected engagement signals to be strongest, pre-contact financial signals to have smaller but real
              effects, and some signals to add nothing.
            </p>
            <h3>Outcome: 90-day retention</h3>
            <p className="definition">
              At least one additional recorded interaction with the partner bank within 90 days of the first program
              interaction. When there is no credit score, we measure trust as behavior: do people stay engaged?
            </p>
          </div>
          <div className="stats">
            <div><b>{paper.n.toLocaleString()}</b> simulated participants</div>
            <div><b>9</b> standardized signals</div>
            <div><b>{paper.n_holdout}</b> held out for validation</div>
            <div><b>{paper.auc.toFixed(2)}</b> holdout AUC</div>
            <div><b>{paper.brier.toFixed(3)}</b> Brier score</div>
            <p className="small muted">AUC 0.5 is a coin flip. Calibration is close to the diagonal.</p>
          </div>
        </div>

        <div className="insight">
          <p className="eyebrow">Conclusion</p>
          <p>
            <b>Relationship signals dominate retention once a person is engaged</b>, so they drive the day-45
            follow-up list. <b>Before contact, the usable parameters are income regularity</b> (β {signed(income.beta)},
            p = {pval(income)}), <b>balance volatility</b> (β {signed(volatility.beta)}, p = {pval(volatility)}) and
            on-time rent (β {signed(rent.beta)}, borderline p = {pval(rent)}). The next screen applies these β weights
            to rank where to go.
          </p>
        </div>

        <h3>Figure 1: Odds ratio per 1 SD (95% CI)</h3>
        <Forest rows={rows} />
        <div className="legend small">
          <span><i style={{ background: GROUP_COLOR.engagement }} /> Post-engagement: unavailable before contact</span>
          <span><i style={{ background: GROUP_COLOR.pre_contact }} /> Pre-contact financial: used for area ranking</span>
          <span><i style={{ background: GROUP_COLOR.weak }} /> Weak signal: CI includes 1</span>
        </div>

        <h3>Table 1: Estimated parameters</h3>
        <table className="results">
          <thead>
            <tr>
              <th>Parameter</th>
              <th className="num">β</th>
              <th className="num">SE</th>
              <th className="num">p</th>
              <th className="num">OR (95% CI)</th>
              <th>Demo uses it to…</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.key} className={c.p < 0.05 ? 'sig' : 'nonsig'}>
                <td>{c.label}</td>
                <td className="num mono">{signed(c.beta)}</td>
                <td className="num mono">{c.se.toFixed(2)}</td>
                <td className="num mono">{pval(c)}</td>
                <td className="num mono">{c.or.toFixed(2)} [{c.or_low.toFixed(2)}, {c.or_high.toFixed(2)}]</td>
                <td><span className={`badge ${DECISIONS[c.key].tone}`}>{DECISIONS[c.key].label}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted">
          β is the change in log-odds of retention per 1 SD; the odds ratio is e<sup>β</sup>. Intercept β<sub>0</sub>{' '}
          = {signed(paper.coefs[0].beta)} (observed retention {pct(paper.observed_retention)}). PCA: the first three
          components each explain about {pct(paper.pca_top3_each)}, matching the three signal groups.
        </p>

        <h3>Interpretation boundary</h3>
        <ul className="limits">
          <li>All data is simulated to validate the pipeline; no real participant data or findings.</li>
          <li>Statistical significance here doesn't establish real-world effects.</li>
          <li>Engagement signals are excluded from area ranking: they don't exist for communities not yet reached.</li>
          <li>Weights must be re-estimated on real pilot data before any decision relies on them.</li>
        </ul>
        {next && (
          <div className="brief-actions">
            <button className="primary big" onClick={next}>Evidence checks out: draft the bank brief →</button>
          </div>
        )}
      </article>
    </section>
  )
}
