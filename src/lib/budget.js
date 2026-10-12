import { estimate } from './rank.js'
import nationalAreas from '../data/national_areas.json'

// Each area is scored with the paper's model, then funded one workshop series at a time.
export const AREAS = nationalAreas.map((a) => {
  const retention = estimate({ ...a, unverified_fields: [] }).retention
  const retainedPerSeries = a.seats * retention
  return { ...a, retention, retainedPerSeries, costPerRetained: a.cost_per_series / retainedPerSeries }
})

function summarize(plan) {
  const rows = AREAS.map((a) => {
    const series = plan[a.area_id] ?? 0
    return { ...a, series, spend: series * a.cost_per_series, people: series * a.seats, retained: series * a.retainedPerSeries }
  })
  const total = (k) => rows.reduce((s, r) => s + r[k], 0)
  return { rows, spend: total('spend'), people: total('people'), retained: total('retained') }
}

// Model-guided: fund the cheapest retained participant first, up to each area's capacity.
export function allocate(budget) {
  const plan = {}
  let left = budget
  const queue = [...AREAS].sort((a, b) => a.costPerRetained - b.costPerRetained)
  let funded = true
  while (funded) {
    funded = false
    for (const a of queue) {
      if ((plan[a.area_id] ?? 0) < a.max_series && a.cost_per_series <= left) {
        plan[a.area_id] = (plan[a.area_id] ?? 0) + 1
        left -= a.cost_per_series
        funded = true
        break
      }
    }
  }
  return summarize(plan)
}

// Baseline: spread series evenly across every area, the "spray and pray" approach.
export function spreadEvenly(budget) {
  const plan = {}
  let left = budget
  let funded = true
  while (funded) {
    funded = false
    for (const a of AREAS) {
      if ((plan[a.area_id] ?? 0) < a.max_series && a.cost_per_series <= left) {
        plan[a.area_id] = (plan[a.area_id] ?? 0) + 1
        left -= a.cost_per_series
        funded = true
      }
    }
  }
  return summarize(plan)
}
