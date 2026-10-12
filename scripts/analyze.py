"""Compute the synthetic research results shown on Screen 2.

Reads src/data/historical_programs.json and writes src/data/research_results.json.
All data is synthetic. Results are illustrative, not real findings.
"""
import json
import math
import statistics
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "src" / "data"

MIN_PARTICIPANTS = 15

# Signals the study tests, with the product decision the prototype takes.
SIGNALS = [
    {"key": "community_partner_count", "label": "Community partners", "unit": "count"},
    {"key": "financial_access_gap", "label": "Financial access gap", "unit": "% households"},
    {"key": "cash_reliance_index", "label": "Cash reliance", "unit": "index 0-100"},
    {"key": "remittance_activity_index", "label": "Remittance activity", "unit": "index 0-100"},
    {"key": "branch_distance_mi", "label": "Distance to branch", "unit": "miles"},
    {"key": "prior_program_retention", "label": "Prior program retention", "unit": "% retained"},
]

# Illustrative weights used by the prototype ranking (PRD section 6).
WEIGHTS = {
    "community_partner_count": 0.35,
    "financial_access_gap": 0.30,
    "cash_reliance_index": 0.20,
    "remittance_activity_index": 0.15,
    "branch_distance_mi": 0.0,
}


def pearson(xs, ys):
    mx, my = statistics.fmean(xs), statistics.fmean(ys)
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    sxx = sum((x - mx) ** 2 for x in xs)
    syy = sum((y - my) ** 2 for y in ys)
    return sxy / math.sqrt(sxx * syy)


def fisher_ci(r, n):
    if n <= 3:
        return -1.0, 1.0
    z = math.atanh(max(min(r, 0.9999), -0.9999))
    se = 1 / math.sqrt(n - 3)
    return math.tanh(z - 1.96 * se), math.tanh(z + 1.96 * se)


def decide(key, r, lo, hi, n):
    if key == "prior_program_retention":
        return "needs_evidence", f"Only {n} areas have an earlier program, and the interval is wide."
    if WEIGHTS.get(key, 0) == 0:
        return "exclude", "Little association with retention; shown as context only."
    if lo > 0:
        return "include", "Positive association; interval excludes zero."
    return "include", "Positive association, but the interval includes zero."


def compute(programs):
    usable = [p for p in programs if p["participants_consented"] >= MIN_PARTICIPANTS]
    rows = []
    for s in SIGNALS:
        pairs = [(p[s["key"]], p["retention_rate_90d"]) for p in usable if p.get(s["key"]) is not None]
        n = len(pairs)
        r = pearson([a for a, _ in pairs], [b for _, b in pairs])
        lo, hi = fisher_ci(r, n)
        decision, note = decide(s["key"], r, lo, hi, n)
        rows.append({
            **s,
            "r": round(r, 2),
            "ci_low": round(lo, 2),
            "ci_high": round(hi, 2),
            "n": n,
            "weight": WEIGHTS.get(s["key"], 0),
            "decision": decision,
            "note": note,
        })

    # Normalization ranges come from history, so candidates are not scaled against each other.
    ranges = {
        k: {"min": min(p[k] for p in programs), "max": max(p[k] for p in programs)}
        for k in WEIGHTS
    }

    rates = [p["retention_rate_90d"] for p in usable]
    total_participants = sum(p["participants_consented"] for p in programs)

    # Simple held-out check: rank the last 8 usable programs by the illustrative weights.
    held = sorted(usable, key=lambda p: p["program_start_date"])[-8:]
    def score(p):
        return sum(
            w * (p[k] - ranges[k]["min"]) / ((ranges[k]["max"] - ranges[k]["min"]) or 1)
            for k, w in WEIGHTS.items()
        )
    ranked = sorted(held, key=score, reverse=True)
    median_all = statistics.median(rates)
    top_half_hits = sum(1 for p in ranked[: len(ranked) // 2] if p["retention_rate_90d"] > median_all)

    return {
        "synthetic": True,
        "title": "Which Pre-Outreach Area Signals Are Associated with 90-Day Financial-Program Retention? A Synthetic Demonstration",
        "min_participants": MIN_PARTICIPANTS,
        "dataset": {
            "programs": len(programs),
            "programs_used": len(usable),
            "programs_too_small": len(programs) - len(usable),
            "areas": len({p["area_id"] for p in programs}),
            "participants": total_participants,
            "median_retention": round(median_all, 3),
            "min_retention": round(min(rates), 3),
            "max_retention": round(max(rates), 3),
        },
        "signals": rows,
        "ranges": ranges,
        "weights": WEIGHTS,
        "holdout": {
            "programs": len(held),
            "top_half": len(ranked) // 2,
            "top_half_above_median": top_half_hits,
        },
    }


def main():
    programs = json.loads((DATA / "historical_programs.json").read_text())
    results = compute(programs)
    (DATA / "research_results.json").write_text(json.dumps(results, indent=2) + "\n")
    for s in results["signals"]:
        print(f'{s["label"]:<26} r={s["r"]:+.2f}  CI [{s["ci_low"]:+.2f}, {s["ci_high"]:+.2f}]  n={s["n"]}  {s["decision"]}')
    print(results["dataset"])
    print(results["holdout"])


if __name__ == "__main__":
    main()
