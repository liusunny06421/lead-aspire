import paper from '../data/paper_model.json'
import candidates from '../data/candidate_areas.json'

// Coefficients from the research paper (Table 1). Areas are scored with the pre-contact
// signals only; engagement signals are held at their average (z = 0) because they don't
// exist for communities nobody has contacted yet.
const coef = Object.fromEntries(paper.coefs.map((c) => [c.key, c]))

export const NEED_GATE = 0.15 // minimum financial access gap: outreach must reach people who need it

// Signals the paper found significant before contact. Each area value is converted to
// standard deviations from the past-participant average, the unit the model was fit in.
export const MODEL_SIGNALS = {
  income_regularity: {
    label: 'Income regularity',
    explain: 'Share of months with a regular income deposit',
    mean: 0.62, sd: 0.18,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  balance_volatility: {
    label: 'Balance volatility',
    explain: 'How much account balances swing month to month (0–100)',
    mean: 45, sd: 15,
    format: (v) => `${v} / 100`,
  },
  rent_on_time: {
    label: 'Rent paid on time',
    explain: 'Share of rent payments made on time',
    mean: 0.78, sd: 0.12,
    format: (v) => `${Math.round(v * 100)}%`,
  },
}

export const CONTEXT_SIGNALS = {
  financial_access_gap: { label: 'Unbanked or underbanked', format: (v) => `${Math.round(v * 100)}%` },
  community_partner_count: { label: 'Community partners', format: (v) => `${v}` },
  branch_distance_mi: { label: 'Distance to branch', format: (v) => `${v} mi` },
}

export const SIGNAL_META = { ...MODEL_SIGNALS, ...CONTEXT_SIGNALS }

export const STATUS = {
  recommended: { label: 'Recommended for pilot review', tone: 'good' },
  alternative: { label: 'Alternative', tone: 'muted' },
  investigate: { label: 'Investigate: data missing', tone: 'warn' },
  lower: { label: 'Not this pilot: low need', tone: 'muted' },
}

const sigmoid = (x) => 1 / (1 + Math.exp(-x))

export function zScore(area, key) {
  const s = MODEL_SIGNALS[key]
  return area[key] == null ? null : (area[key] - s.mean) / s.sd
}

export function contributions(area) {
  return Object.keys(MODEL_SIGNALS).map((k) => {
    const z = zScore(area, k)
    return { key: k, beta: coef[k].beta, z, contribution: z == null ? null : coef[k].beta * z }
  })
}

export function completeness(area) {
  const keys = Object.keys(MODEL_SIGNALS)
  return keys.filter((k) => area[k] != null && !area.unverified_fields.includes(k)).length / keys.length
}

export function estimate(area) {
  const logit = coef.intercept.beta + contributions(area).reduce((s, c) => s + (c.contribution ?? 0), 0)
  return { logit, retention: sigmoid(logit) }
}

const pct = (v) => `${Math.round(v * 100)}%`

function explain(area, status, est) {
  const parts = contributions(area)
    .filter((c) => c.z != null)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
  const top = parts[0]
  const dir = (c) => (c.contribution >= 0 ? 'raises' : 'lowers')
  const describe = (c) =>
    `${MODEL_SIGNALS[c.key].label.toLowerCase()} (${MODEL_SIGNALS[c.key].format(area[c.key])}) ${dir(c)} it most`
  if (status === 'investigate') {
    const missing = area.missing_fields.map((k) => SIGNAL_META[k].label.toLowerCase())
    const unverified = area.unverified_fields.map((k) => SIGNAL_META[k].label.toLowerCase())
    return [
      `The model can't score this area: ${missing.join(', ') || 'nothing'} is missing and ${unverified.join(', ') || 'nothing'} is unverified.`,
      `Request the data before comparing it.`,
    ]
  }
  if (status === 'lower') {
    return [
      `Model-estimated retention is ${pct(est.retention)}, but only ${pct(area.financial_access_gap)} of households are unbanked or underbanked, below the ${pct(NEED_GATE)} need threshold.`,
      `High retention here would mostly reach people who are already banked.`,
    ]
  }
  return [
    `Model-estimated 90-day retention: ${pct(est.retention)}. ${describe(top)[0].toUpperCase()}${describe(top).slice(1)}.`,
    status === 'recommended'
      ? `Highest estimate among areas that pass both the need and data checks.`
      : `Passes both checks, but scores below the recommended area.`,
  ]
}

export function rankAreas() {
  const rows = candidates.map((a) => {
    const est = estimate(a)
    return {
      ...a,
      ...est,
      completeness: completeness(a),
      hasData: completeness(a) === 1,
      hasNeed: a.financial_access_gap >= NEED_GATE,
    }
  })
  const eligible = rows.filter((r) => r.hasData && r.hasNeed).sort((a, b) => b.logit - a.logit)
  return rows.map((r) => {
    const status = !r.hasData ? 'investigate' : !r.hasNeed ? 'lower' : r === eligible[0] ? 'recommended' : 'alternative'
    const topSignals = contributions(r)
      .filter((c) => c.contribution != null && c.contribution > 0)
      .sort((a, b) => b.contribution - a.contribution)
      .map((c) => c.key)
    return { ...r, status, explanation: explain(r, status, r), topSignals: [...topSignals, 'financial_access_gap'] }
  })
}

// Participant-level follow-up uses the full model's early-engagement coefficients.
export const followupModel = {
  visits: coef.consented_visits,
  optin: coef.optin_response,
  duration: coef.relationship_duration,
}

export { paper, candidates }
